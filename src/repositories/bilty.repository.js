import { Bilty } from "../models/Bilty.model.js";

export const biltyRepository = {
  create: async (data, session = null) => {
    if (data.clientId) {
      const existing = await Bilty.findOne({ clientId: data.clientId });
      if (existing) return existing;
    }
    return session ? Bilty.create([data], { session }).then((r) => r[0]) : Bilty.create(data);
  },

  update: (id, data, session = null) =>
    Bilty.findByIdAndUpdate(id, data, { new: true, session }),

  findById: (id) => Bilty.findById(id).populate("party"),

  findAll: ({ party, startDate, endDate, onlyWithCharge = false } = {}) => {
    const query = { isDeleted: false };
    if (party) query.party = party;
    if (onlyWithCharge) query.hasDeliveryCharge = true;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    return Bilty.find(query).populate("party").sort({ date: -1 });
  },

  deliveryChargeTotal: async ({ party, startDate, endDate } = {}) => {
    const match = { hasDeliveryCharge: true, isDeleted: false };
    if (party) match.party = party;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    const result = await Bilty.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$deliveryCharge" } } },
    ]);
    return result[0]?.total || 0;
  },

  // Count + product value totals for bills in a date range (dashboard summary).
  periodStats: async ({ party, startDate, endDate } = {}) => {
    const match = { isDeleted: false };
    if (party) match.party = party;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    const result = await Bilty.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: "$productValue" },
          deliveryCharges: { $sum: "$deliveryCharge" },
        },
      },
    ]);
    const r = result[0] || {};
    return { count: r.count || 0, total: r.total || 0, deliveryCharges: r.deliveryCharges || 0 };
  },
};
