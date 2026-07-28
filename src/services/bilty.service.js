import mongoose from "mongoose";
import { biltyRepository } from "../repositories/bilty.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { partyRepository } from "../repositories/party.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { ledgerRepository } from "../repositories/ledger.repository.js";
import { companyRepository } from "../repositories/company.repository.js";
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

/**
 * A custom bill number must be unique across all *live* bills. Soft-deleted
 * bills are ignored so a reversed number can be reused; `excludeId` skips the
 * bill being edited so re-saving it keeps its own number.
 */
const assertBillNumberFree = async (billNumber, excludeId = null) => {
  const trimmed = String(billNumber || "").trim();
  if (!trimmed) return;
  const query = { billNumber: trimmed, isDeleted: false };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Bilty.findOne(query).lean();
  if (existing) throw new ApiError(409, `Bill number "${trimmed}" is already used`);
};

/**
 * Price each requested item, compute scheme free units and the total product
 * value. When goods come from my own stock, verify there's enough on hand
 * (sold quantity + scheme free units both leave the warehouse).
 */
const buildItems = async (items, fromCompany, session) => {
  let productValue = 0;
  const biltyItems = [];
  for (const it of items) {
    const product = await productRepository.findById(it.productId);
    if (!product) throw new ApiError(404, `Product not found: ${it.productId}`);
    const freeQuantity = productService.calculateFreeUnits(product, it.quantity);

    if (!fromCompany) {
      const inv = await inventoryRepository.findByProduct(product._id, session);
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
  return { biltyItems, productValue };
};

/**
 * Apply a bill's financial + stock effects:
 *   - product value → debit to the party ledger
 *   - delivery charge (if any) → credit to the party ledger
 *   - fromCompany  → add product value to company payable
 *   - from my stock → decrease inventory + log stock-out movements
 */
const applyBiltyEffects = async (bilty, session) => {
  const shipmentLabel = bilty.fromCompany ? "direct shipment" : "from stock";

  await ledgerService.applyLedgerEntry(
    {
      partyId: bilty.party,
      type: "debit",
      amount: bilty.productValue,
      description: `Bill ${bilty.billNumber} - ${shipmentLabel}`,
      source: "bilty",
      refId: bilty._id,
      date: bilty.date,
    },
    session
  );

  if (bilty.hasDeliveryCharge && bilty.deliveryCharge > 0) {
    await ledgerService.applyLedgerEntry(
      {
        partyId: bilty.party,
        type: "credit",
        amount: bilty.deliveryCharge,
        description: `Delivery charge - Bill ${bilty.billNumber}`,
        source: "delivery_charge",
        refId: bilty._id,
        date: bilty.date,
      },
      session
    );
  }

  if (bilty.fromCompany) {
    await companyService.addLiability(
      {
        amount: bilty.productValue,
        source: "bilty",
        refId: bilty._id,
        note: `Bill ${bilty.billNumber} direct shipment`,
      },
      session
    );
  } else {
    for (const bi of bilty.items) {
      const out = bi.quantity + bi.freeQuantity;
      const stock = await inventoryRepository.adjustStock(bi.product, -out, session);
      await inventoryRepository.addMovement(
        {
          product: bi.product,
          direction: "out",
          quantity: out,
          party: bilty.party,
          note: bi.freeQuantity
            ? `Bill ${bilty.billNumber}: ${bi.quantity} sold + ${bi.freeQuantity} free`
            : `Bill ${bilty.billNumber}: ${bi.quantity} dispatched`,
          balanceAfter: stock.currentStock,
          date: bilty.date || new Date(),
        },
        session
      );
    }
  }
};

/**
 * Undo everything applyBiltyEffects did: soft-delete the bill's ledger rows,
 * drop its company liability (direct shipment) or put stock back (own stock),
 * then rebuild the party's running balances. Used by both edit and delete.
 */
const reverseBiltyEffects = async (bilty, reason, session) => {
  const rows = await ledgerRepository.findByRef(bilty._id).session(session);
  for (const r of rows) {
    await ledgerRepository.softDelete(r._id, reason || "Bill reversed", session);
  }

  if (bilty.fromCompany) {
    await companyRepository.removeByRef(bilty._id, session);
  } else {
    for (const bi of bilty.items) {
      const back = bi.quantity + bi.freeQuantity;
      const stock = await inventoryRepository.adjustStock(bi.product, back, session);
      await inventoryRepository.addMovement(
        {
          product: bi.product,
          direction: "in",
          quantity: back,
          party: bilty.party,
          note: `Bill ${bilty.billNumber} reversed`,
          balanceAfter: stock.currentStock,
          date: new Date(),
        },
        session
      );
    }
  }

  await ledgerService.recalcParty(bilty.party, session);
};

export const biltyService = {
  /**
   * Create a bill for a party. See applyBiltyEffects for how the money and
   * stock move. A custom bill number is used verbatim (must be unique);
   * otherwise the next auto number is consumed.
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

    await assertBillNumberFree(billNumber);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const finalBillNumber =
        billNumber && String(billNumber).trim()
          ? String(billNumber).trim()
          : await nextBillNumber(session);

      const { biltyItems, productValue } = await buildItems(items, fromCompany, session);

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

      await applyBiltyEffects(bilty, session);
      // Rebuild running balances so a back-dated bill lands in the right place.
      await ledgerService.recalcParty(partyId, session);

      await session.commitTransaction();
      return bilty;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  /**
   * Edit an existing bill. The old effects are fully reversed and the new ones
   * re-applied inside one transaction, so ledger balances, company payable and
   * inventory always end up consistent with the edited bill.
   */
  updateBilty: async (id, patch = {}) => {
    const existing = await Bilty.findOne({ _id: id, isDeleted: false });
    if (!existing) throw new ApiError(404, "Bill not found");

    // Resolve the effective fields (fall back to current values when omitted).
    const fromCompany =
      patch.fromCompany != null ? !!patch.fromCompany : existing.fromCompany;
    const hasDeliveryCharge =
      patch.hasDeliveryCharge != null ? !!patch.hasDeliveryCharge : existing.hasDeliveryCharge;
    const deliveryCharge = hasDeliveryCharge
      ? patch.deliveryCharge != null
        ? patch.deliveryCharge
        : existing.deliveryCharge
      : 0;
    if (hasDeliveryCharge && (!deliveryCharge || deliveryCharge <= 0)) {
      throw new ApiError(400, "Delivery charge amount required when checkbox is checked");
    }

    const billNumber =
      patch.billNumber != null && String(patch.billNumber).trim()
        ? String(patch.billNumber).trim()
        : existing.billNumber;
    await assertBillNumberFree(billNumber, existing._id);

    const date = patch.date ? new Date(patch.date) : existing.date;
    const items =
      patch.items && patch.items.length
        ? patch.items
        : existing.items.map((it) => ({ productId: String(it.product), quantity: it.quantity }));

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Undo the current bill first so stock checks for the new lines see the
      // returned stock, then re-price and re-apply.
      await reverseBiltyEffects(existing, "Edited", session);

      const { biltyItems, productValue } = await buildItems(items, fromCompany, session);

      const updated = await biltyRepository.update(
        id,
        {
          billNumber,
          date,
          items: biltyItems,
          productValue,
          fromCompany,
          hasDeliveryCharge,
          deliveryCharge,
        },
        session
      );

      await applyBiltyEffects(updated, session);
      // Re-applied entries carry the bill's date; rebuild so their running
      // balances and everything after them are correct.
      await ledgerService.recalcParty(updated.party, session);

      await session.commitTransaction();
      return updated;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  /**
   * Soft-delete a bill: reverse its ledger / company / inventory effects and
   * keep the record (hidden from lists) for audit.
   */
  deleteBilty: async (id, reason = "") => {
    const existing = await Bilty.findOne({ _id: id, isDeleted: false });
    if (!existing) throw new ApiError(404, "Bill not found");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await reverseBiltyEffects(existing, reason || "Bill deleted", session);
      await biltyRepository.update(
        id,
        { isDeleted: true, deleteReason: reason || "Bill deleted" },
        session
      );
      await session.commitTransaction();
      return { deleted: true };
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
