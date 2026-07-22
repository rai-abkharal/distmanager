// src/services/party.service.js
import { partyRepository } from "../repositories/party.repository.js";
import { ledgerService } from "./ledger.service.js";
import { ApiError } from "../utils/ApiError.js";

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
    const party = await partyRepository.update(id, data);
    if (!party) throw new ApiError(404, "Party not found");
    return party;
  },

  archive: async (id) => {
    await partyRepository.archive(id);
  },

  totalReceivables: async () => {
    const total = await partyRepository.totalReceivables();
    return { totalReceivables: total };
  },
};