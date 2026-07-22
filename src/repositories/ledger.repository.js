import { Ledger } from "../models/Ledger.model.js";

export const ledgerRepository = {
  create: (data, session = null) =>
    session ? Ledger.create([data], { session }).then((r) => r[0]) : Ledger.create(data),

  findByParty: (partyId, { startDate, endDate } = {}) => {
    const query = { party: partyId, isDeleted: false };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    return Ledger.find(query).sort({ date: 1, createdAt: 1 });
  },

  lastEntry: (partyId) =>
    Ledger.findOne({ party: partyId, isDeleted: false }).sort({ date: -1, createdAt: -1 }),

  findById: (id) => Ledger.findById(id),

  softDelete: (id, reason) =>
    Ledger.findByIdAndUpdate(id, { isDeleted: true, editReason: reason }, { new: true }),

  update: (id, data) => Ledger.findByIdAndUpdate(id, data, { new: true }),
};