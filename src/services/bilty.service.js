import mongoose from "mongoose";
import { biltyRepository } from "../repositories/bilty.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { partyRepository } from "../repositories/party.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { ledgerService } from "./ledger.service.js";
import { productService } from "./product.service.js";
import { companyService } from "./company.service.js";
import { Counter } from "../models/Counter.model.js";
import { Bilty } from "../models/Bilty.model.js";
import { ApiError } from "../utils/ApiError.js";

/** Next auto bill number ("INV-0007"), atomically incremented in the session. */
const nextBillNumber = async (session) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "bilty" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return `INV-${String(counter.seq).padStart(4, "0")}`;
};

export const biltyService = {
  /**
   * Create a bill for a party.
   *
   * fromCompany = true (direct shipment from the company):
   *   - product value → debit to party ledger + add to company payable
   *   - my own inventory is untouched
   *
   * fromCompany = false (goods come out of my own stock):
   *   - product value → debit to party ledger
   *   - my inventory decreases by sold + scheme-free units
   *   - nothing is added to the company payable
   *
   * delivery charge (if any) → credit to party ledger in both cases
   */
  createBilty: async ({
    date,
    partyId,
    items,
    fromCompany = true,
    hasDeliveryCharge,
    deliveryCharge = 0,
    billNumber,
  }) => {
    const party = await partyRepository.findById(partyId);
    if (!party) throw new ApiError(404, "Party not found");
    if (!items?.length) throw new ApiError(400, "At least one item required");
    if (hasDeliveryCharge && (!deliveryCharge || deliveryCharge <= 0)) {
      throw new ApiError(400, "Delivery charge amount required when checkbox is checked");
    }

    // A custom bill number must be unique across all bills.
    if (billNumber) {
      const trimmed = String(billNumber).trim();
      if (trimmed) {
        const existing = await Bilty.findOne({ billNumber: trimmed }).lean();
        if (existing) throw new ApiError(409, `Bill number "${trimmed}" is already used`);
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Use the caller's bill number when provided, otherwise auto-sequence.
      const finalBillNumber =
        billNumber && String(billNumber).trim()
          ? String(billNumber).trim()
          : await nextBillNumber(session);
      // Build items with pricing + scheme free units
      let productValue = 0;
      const biltyItems = [];
      for (const it of items) {
        const product = await productRepository.findById(it.productId);
        if (!product) throw new ApiError(404, `Product not found: ${it.productId}`);
        const freeQuantity = productService.calculateFreeUnits(product, it.quantity);

        // When shipping from my own stock, make sure there's enough on hand
        // (sold quantity + free scheme units both leave the warehouse).
        if (!fromCompany) {
          const inv = await inventoryRepository.findByProduct(product._id);
          const needed = it.quantity + freeQuantity;
          if (!inv || inv.currentStock < needed) {
            throw new ApiError(
              400,
              `Insufficient stock for ${product.name}: need ${needed}, have ${inv?.currentStock || 0}`
            );
          }
        }

        const lineValue = it.quantity * product.price;
        productValue += lineValue;
        biltyItems.push({
          product: product._id,
          productName: product.name,
          quantity: it.quantity,
          freeQuantity,
          pricePerUnit: product.price,
          lineValue,
        });
      }

      const bilty = await biltyRepository.create(
        {
          billNumber: finalBillNumber,
          date: date || new Date(),
          party: partyId,
          items: biltyItems,
          productValue,
          fromCompany: !!fromCompany,
          hasDeliveryCharge: !!hasDeliveryCharge,
          deliveryCharge: hasDeliveryCharge ? deliveryCharge : 0,
        },
        session
      );

      const shipmentLabel = fromCompany ? "direct shipment" : "from stock";

      // Debit product value to party
      await ledgerService.applyLedgerEntry(
        {
          partyId,
          type: "debit",
          amount: productValue,
          description: `Bill ${finalBillNumber} - ${shipmentLabel}`,
          source: "bilty",
          refId: bilty._id,
          date,
        },
        session
      );

      // Credit delivery charge to party
      if (hasDeliveryCharge && deliveryCharge > 0) {
        await ledgerService.applyLedgerEntry(
          {
            partyId,
            type: "credit",
            amount: deliveryCharge,
            description: `Delivery charge - Bill ${finalBillNumber}`,
            source: "delivery_charge",
            refId: bilty._id,
            date,
          },
          session
        );
      }

      if (fromCompany) {
        // Add product value to company payable
        await companyService.addLiability(
          {
            amount: productValue,
            source: "bilty",
            refId: bilty._id,
            note: `Bill ${finalBillNumber} direct shipment`,
          },
          session
        );
      } else {
        // Goods leave my own inventory — deduct stock + log movements.
        for (const bi of biltyItems) {
          const out = bi.quantity + bi.freeQuantity;
          const stock = await inventoryRepository.adjustStock(bi.product, -out, session);
          await inventoryRepository.addMovement(
            {
              product: bi.product,
              direction: "out",
              quantity: out,
              party: partyId,
              note: bi.freeQuantity
                ? `Bill ${finalBillNumber}: ${bi.quantity} sold + ${bi.freeQuantity} free`
                : `Bill ${finalBillNumber}: ${bi.quantity} dispatched`,
              balanceAfter: stock.currentStock,
              date: date || new Date(),
            },
            session
          );
        }
      }

      await session.commitTransaction();
      return bilty;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  list: (filters) => biltyRepository.findAll(filters),
  getById: (id) => biltyRepository.findById(id),
  /** Preview of the next auto bill number without consuming the counter. */
  previewNextNumber: async () => {
    const counter = await Counter.findById("bilty").lean();
    const next = (counter?.seq || 0) + 1;
    return { billNumber: `INV-${String(next).padStart(4, "0")}` };
  },
  deliveryChargeReport: async (filters) => {
    const bilties = await biltyRepository.findAll({ ...filters, onlyWithCharge: true });
    const total = await biltyRepository.deliveryChargeTotal(filters);
    return { bilties, total };
  },
};