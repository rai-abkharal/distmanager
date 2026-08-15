import { ledgerRepository } from "../repositories/ledger.repository.js";
import { partyRepository } from "../repositories/party.repository.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { Party } from "../models/Party.model.js";
import { resolveReference } from "../utils/client-reference.js";

/**
 * Core function: creates a ledger entry, recalculates running balance,
 * and updates the party's currentBalance.
 * debit  => party owes more (+amount)
 * credit => party owes less (-amount)
 */
const applyLedgerEntry = async (
  { partyId, type, amount, description, paymentMode = null, source = "manual", refId = null, date },
  session = null
) => {
  const party = await partyRepository.findById(partyId);
  if (!party) throw new ApiError(404, "Party not found");

  const last = await ledgerRepository.lastEntry(partyId, session);
  const prevBalance = last ? last.runningBalance : 0;
  const delta = type === "debit" ? amount : -amount;
  const runningBalance = prevBalance + delta;

  const entry = await ledgerRepository.create(
    {
      party: partyId,
      type,
      amount,
      description,
      paymentMode,
      source,
      refId,
      date: date || new Date(),
      runningBalance,
    },
    session
  );

  await partyRepository.updateBalance(partyId, delta, session);
  return entry;
};

export const ledgerService = {
  applyLedgerEntry,

  // Record a payment received from a party (credit)
  recordPayment: async ({
    partyId,
    partyClientId,
    amount,
    paymentMode = "cash",
    description = "Payment received",
    date,
    hasDeliveryCharge = false,
    deliveryCharge = 0,
  }) => {
    if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
    const party = await resolveReference(Party, partyId, partyClientId, "Party");
    if (hasDeliveryCharge && deliveryCharge <= 0) {
      throw new ApiError(400, "Delivery charge amount is required when selected");
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const payment = await applyLedgerEntry({
        partyId: party._id,
        type: "credit",
        amount,
        paymentMode,
        description,
        source: "payment",
        date,
      }, session);
      if (hasDeliveryCharge) {
        await applyLedgerEntry({
          partyId: party._id,
          type: "credit",
          amount: deliveryCharge,
          description: "Delivery charge",
          source: "delivery_charge",
          date,
        }, session);
      }
      await recalcPartyBalance(party._id, session);
      await session.commitTransaction();
      return payment;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // Standalone delivery charge credited to party
  recordDeliveryCharge: async ({
    partyId,
    partyClientId,
    amount,
    description = "Delivery charge",
    date,
  }) => {
    if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
    const party = await resolveReference(Party, partyId, partyClientId, "Party");
    const entry = await applyLedgerEntry({
      partyId: party._id,
      type: "credit",
      amount,
      description: description || "Delivery charge",
      source: "delivery_charge",
      date: date || new Date(),
    });
    return entry;
  },

  // Manual debit/credit adjustment
  manualEntry: async ({ partyId, type, amount, description, date }) => {
    if (!["debit", "credit"].includes(type)) throw new ApiError(400, "Invalid type");
    if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
    return applyLedgerEntry({ partyId, type, amount, description, source: "manual", date });
  },

  getPartyLedger: async (partyId, filters) => {
    const party = await partyRepository.findById(partyId);
    if (!party) throw new ApiError(404, "Party not found");
    const entries = await ledgerRepository.findByParty(partyId, filters);
    return { party, entries };
  },

  listPayments: (filters) => ledgerRepository.findPayments(filters),

  // Edit an existing entry's amount / type / description / date, then rebuild
  // running balances. Manual, payment, and standalone delivery charges are editable.
  editEntry: async (entryId, { amount, type, description, paymentMode, date }) => {
    const entry = await ledgerRepository.findById(entryId);
    if (!entry) throw new ApiError(404, "Ledger entry not found");
    if (entry.isDeleted) throw new ApiError(400, "Cannot edit a deleted entry");
    if (!["manual", "payment", "delivery_charge"].includes(entry.source)) {
      throw new ApiError(
        400,
        "Only manual adjustments, payments and delivery charges can be edited. Delete the source bill to change a bill entry."
      );
    }

    const patch = {};
    if (amount != null) {
      if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
      patch.amount = amount;
    }
    if (type != null) {
      if (!["debit", "credit"].includes(type)) throw new ApiError(400, "Invalid type");
      patch.type = type;
    }
    if (description != null) patch.description = description;
    if (paymentMode !== undefined) patch.paymentMode = paymentMode;
    if (date != null) patch.date = new Date(date);

    await ledgerRepository.update(entryId, patch);
    await recalcPartyBalance(entry.party);
    return ledgerRepository.findById(entryId);
  },

  // Soft delete + rebuild running balances for that party
  deleteEntry: async (entryId, reason) => {
    await ledgerRepository.softDelete(entryId, reason);
    await recalcPartyBalance(entry.party);
    return { deleted: true };
  },

  deleteDeliveryCharge: async (entryId) => {
    const entry = await ledgerRepository.findById(entryId);
    if (!entry || entry.isDeleted || entry.source !== "delivery_charge") {
      throw new ApiError(404, "Delivery charge not found");
    }
    await ledgerRepository.softDelete(entryId, "Delivery charge deleted");
    await recalcPartyBalance(entry.party);
    return { deleted: true };
  },

  removePartyEntries: async (partyId, reason = "Party deleted") => {
    await ledgerRepository.softDeleteByParty(partyId, reason);
    await partyRepository.update(partyId, { currentBalance: 0 });
  },

  // Rebuild running balances after external changes (e.g. a bill reversal).
  recalcParty: (partyId, session = null) => recalcPartyBalance(partyId, session),
};

// Rebuild running balances after edit/delete
const recalcPartyBalance = async (partyId, session = null) => {
  const entries = await ledgerRepository.findByParty(partyId, {}, session);
  let running = 0;
  for (const e of entries) {
    running += e.type === "debit" ? e.amount : -e.amount;
    await ledgerRepository.update(e._id, { runningBalance: running }, session);
  }
  await partyRepository.update(partyId, { currentBalance: running }, session);
};
