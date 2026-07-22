import { Bilty } from "../models/Bilty.model.js";

export const biltyRepository = {
  create: (data, session = null) =>
    session ? Bilty.create([data], { session }).then((r) => r[0]) : Bilty.create(data),

  findById: (id) => Bilty.findById(id).populate("party"),

  findAll: ({ party, startDate, endDate, onlyWithCharge = false } = {}) => {
    const query = {};
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
    const match = { hasDeliveryCharge: true };
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
};