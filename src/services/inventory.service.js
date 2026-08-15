import mongoose from "mongoose";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { ledgerService } from "./ledger.service.js";
import { productService } from "./product.service.js";
import { companyService } from "./company.service.js";
import { ApiError } from "../utils/ApiError.js";

export const inventoryService = {
  // Receive stock from company → +inventory, +company liability
  receiveStock: async ({ productId, quantity, note = "" }) => {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const stock = await inventoryRepository.adjustStock(productId, quantity);
    await inventoryRepository.addMovement({
      product: productId,
      direction: "in",
      quantity,
      note: note || "Stock received from company",
      balanceAfter: stock.currentStock,
    });

    // Stock received adds to company payable
    await companyService.addLiability({
      amount: quantity * product.price,
      source: "stock_receipt",
      note: `Stock received: ${quantity} ${product.unit} of ${product.name}`,
    });

    return stock;
  },

  // Receive several products from the company in one shipment.
  // Each line: +inventory + adds its value to the company payable, atomically.
  receiveStockBatch: async ({ items, note = "", date }) => {
    if (!items?.length) throw new ApiError(400, "At least one item required");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const results = [];
      let totalValue = 0;
      const names = [];

      for (const it of items) {
        if (!it.quantity || it.quantity <= 0) {
          throw new ApiError(400, "Each item needs a quantity greater than 0");
        }
        const product = await productRepository.findById(it.productId);
        if (!product) throw new ApiError(404, `Product not found: ${it.productId}`);

        const stock = await inventoryRepository.adjustStock(it.productId, it.quantity, session);
        await inventoryRepository.addMovement(
          {
            product: it.productId,
            direction: "in",
            quantity: it.quantity,
            note: note || "Stock received from company",
            balanceAfter: stock.currentStock,
            date: date || new Date(),
          },
          session
        );

        totalValue += it.quantity * product.price;
        names.push(`${it.quantity} ${product.unit} ${product.name}`);
        results.push(stock);
      }

      // Whole shipment value added to company payable as one entry.
      await companyService.addLiability(
        {
          amount: totalValue,
          source: "stock_receipt",
          note: note || `Stock received: ${names.join(", ")}`,
          date,
        },
        session
      );

      await session.commitTransaction();
      return { received: results.length, totalValue };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // Dispatch stock to a party from home stock → -inventory, +party debit
  dispatchToParty: async ({ productId, partyId, quantity }) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const product = await productRepository.findById(productId);
      if (!product) throw new ApiError(404, "Product not found");

      const inv = await inventoryRepository.findByProduct(productId);
      const freeUnits = productService.calculateFreeUnits(product, quantity);
      const totalOut = quantity + freeUnits;

      if (!inv || inv.currentStock < totalOut) {
        throw new ApiError(400, "Insufficient stock");
      }

      const stock = await inventoryRepository.adjustStock(productId, -totalOut, session);
      await inventoryRepository.addMovement(
        {
          product: productId,
          direction: "out",
          quantity: totalOut,
          party: partyId,
          note: freeUnits ? `${quantity} sold + ${freeUnits} free` : `${quantity} dispatched`,
          balanceAfter: stock.currentStock,
        },
        session
      );

      // Only paid quantity is debited (free units = 0 value)
      const value = quantity * product.price;
      await ledgerService.applyLedgerEntry(
        {
          partyId,
          type: "debit",
          amount: value,
          description: `Delivery: ${quantity} ${product.unit} ${product.name}${freeUnits ? ` (+${freeUnits} free)` : ""}`,
          source: "delivery",
        },
        session
      );

      await session.commitTransaction();
      return { stock, value, freeUnits };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  getStockLevels: () => inventoryRepository.findAll(),
  getMovements: (productId, filters) => inventoryRepository.movements(productId, filters),
  setThreshold: ({ productId, threshold, lowStockThreshold }) =>
    inventoryRepository.setThreshold(
      productId,
      threshold != null ? threshold : lowStockThreshold
    ),
  setStock: async ({ productId, quantity, note = "" }) => {
    if (quantity < 0) throw new ApiError(400, "Stock cannot be negative");
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");
    const existing = await inventoryRepository.findByProduct(productId);
    const current = existing?.currentStock || 0;
    const delta = quantity - current;
    const stock = await inventoryRepository.adjustStock(productId, delta);
    if (delta !== 0) {
      await inventoryRepository.addMovement({
        product: productId,
        direction: delta > 0 ? "in" : "out",
        quantity: Math.abs(delta),
        note: note || "Stock correction from product edit",
        balanceAfter: stock.currentStock,
      });
    }
    return stock;
  },
  lowStock: () => inventoryRepository.lowStock(),
};
