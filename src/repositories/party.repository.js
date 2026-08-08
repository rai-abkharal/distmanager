import { Party } from "../models/Party.model.js";

const SORT_MAP = {
  city: { city: 1 },
  name: { name: 1 },
  balance_high: { currentBalance: -1 },
  balance_low: { currentBalance: 1 },
  recent: { lastActiveAt: -1 },
};

export const partyRepository = {
  create: (data) => Party.create(data),

  findById: (id) => Party.findById(id),

  findAll: ({ search, city, sortBy = "name", includeArchived = false }) => {
    const query = {};
    if (!includeArchived) query.isArchived = false;
    if (city) query.city = city;
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // A party is identified in the UI as "Name · City", so either part
      // should match the same search field.
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { city: { $regex: escaped, $options: "i" } },
      ];
    }
    return Party.find(query).sort(SORT_MAP[sortBy] || SORT_MAP.name).limit(100);
  },

  update: (id, data, session = null) => Party.findByIdAndUpdate(id, data, { new: true, session }),

  updateBalance: (id, delta, session = null) =>
    Party.findByIdAndUpdate(
      id,
      { $inc: { currentBalance: delta }, lastActiveAt: new Date() },
      { new: true, session }
    ),

  archive: (id) => Party.findByIdAndUpdate(id, { isArchived: true }, { new: true }),

  totalReceivables: async () => {
    const result = await Party.aggregate([
      { $match: { isArchived: false, currentBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$currentBalance" } } },
    ]);
    return result[0]?.total || 0;
  },
};
