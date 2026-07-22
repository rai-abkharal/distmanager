import { ledgerRepository } from "../repositories/ledger.repository.js";
import { partyRepository } from "../repositories/party.repository.js";
import { ApiError } from "../utils/ApiError.js";

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

  const last = await ledgerRepository.lastEntry(partyId);
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
  recordPayment: async ({ partyId, amount, paymentMode = "cash", description = "Payment received", date }) => {
    if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
    return applyLedgerEntry({
      partyId,
      type: "credit",
      amount,
      paymentMode,
      description,
      source: "payment",
      date,
    });
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

  // Soft delete + rebuild running balances for that party
  deleteEntry: async (entryId, reason) => {
    const entry = await ledgerRepository.findById(entryId);
    if (!entry) throw new ApiError(404, "Ledger entry not found");
    await ledgerRepository.softDelete(entryId, reason);
    await recalcPartyBalance(entry.party);
    return { deleted: true };
  },
};

// Rebuild running balances after edit/delete
const recalcPartyBalance = async (partyId) => {
  const entries = await ledgerRepository.findByParty(partyId);
  let running = 0;
  for (const e of entries) {
    running += e.type === "debit" ? e.amount : -e.amount;
    await ledgerRepository.update(e._id, { runningBalance: running });
  }
  await partyRepository.update(partyId, { currentBalance: running });
};