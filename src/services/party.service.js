// src/services/party.service.js
import { partyRepository } from "../repositories/party.repository.js";
import { ledgerService } from "./ledger.service.js";
import { ApiError } from "../utils/ApiError.js";

import { Ledger } from "../models/Ledger.model.js";

export const partyService = {
  create: async (data) => {
    const party = await partyRepository.create(data);

    // Opening balance seeds the ledger so it shows in the running balance,
    // not just as a stored number. +ve = party owes us (debit), -ve = credit.
    const opening = Number(data.openingBalance) || 0;
    if (opening !== 0) {
      await ledgerService.applyLedgerEntry({
        partyId: party._id,
        type: opening > 0 ? "debit" : "credit",
        amount: Math.abs(opening),
        description: "Opening balance",
        source: "opening",
      });
      return partyRepository.findById(party._id);
    }

    return party;
  },

  list: async (filters) => {
    const parties = await partyRepository.findAll(filters);
    return parties;
  },

  getById: async (id) => {
    const party = await partyRepository.findById(id);
    if (!party) throw new ApiError(404, "Party not found");
    return party;
  },

  update: async (id, data) => {
    const existing = await partyRepository.findById(id);
    if (!existing) throw new ApiError(404, "Party not found");

    if (data.openingBalance !== undefined) {
      const newOpening = Number(data.openingBalance) || 0;
      const openingEntry = await Ledger.findOne({ party: id, source: "opening" });
      if (newOpening === 0) {
        if (openingEntry && !openingEntry.isDeleted) {
          await Ledger.findByIdAndUpdate(openingEntry._id, {
            isDeleted: true,
            editReason: "Opening balance reset to 0",
          });
        }
      } else {
        const type = newOpening > 0 ? "debit" : "credit";
        const amount = Math.abs(newOpening);
        if (openingEntry) {
          await Ledger.findByIdAndUpdate(openingEntry._id, {
            type,
            amount,
            description: "Opening balance",
            isDeleted: false,
            editReason: null,
          });
        } else {
          await Ledger.create({
            party: id,
            type,
            amount,
            description: "Opening balance",
            source: "opening",
            date: existing.createdAt || new Date(),
            runningBalance: 0,
          });
        }
      }
    }

    const party = await partyRepository.update(id, data);
    if (!party) throw new ApiError(404, "Party not found");
    await ledgerService.recalcParty(id);
    return partyRepository.findById(id);
  },

  archive: async (id) => {
    await partyRepository.archive(id);
  },

  remove: async (id) => {
    const party = await partyRepository.findById(id);
    if (!party) throw new ApiError(404, "Party not found");
    // Removed parties must not continue contributing payments to cash-in-hand.
    await ledgerService.removePartyEntries(id);
    await partyRepository.archive(id);
  },

  totalReceivables: async () => {
    const total = await partyRepository.totalReceivables();
    return { totalReceivables: total };
  },
};
