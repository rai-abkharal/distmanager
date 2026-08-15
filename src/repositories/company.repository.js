import { CompanyPayment, CompanyLedger } from "../models/CompanyAccount.model.js";

export const companyRepository = {
  addLedgerEntry: (data, session = null) =>
    session ? CompanyLedger.create([data], { session }).then((r) => r[0]) : CompanyLedger.create(data),

  // Reverse a source document's liability by physically removing its entries.
  removeByRef: (refId, session = null) =>
    CompanyLedger.deleteMany({ refId }, { session }),

  addPayment: (data) => CompanyPayment.create(data),

  payments: ({ cycleMonth, startDate, endDate } = {}) => {
    const query = {};
    if (cycleMonth) query.cycleMonth = cycleMonth;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    return CompanyPayment.find(query).sort({ date: -1 });
  },

  ledgerByMonth: (cycleMonth) => CompanyLedger.find({ cycleMonth }).sort({ date: 1 }),

  ledgerByRange: ({ startDate, endDate, cycleMonth } = {}) => {
    const query = {};
    if (cycleMonth) query.cycleMonth = cycleMonth;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    return CompanyLedger.find(query).sort({ date: 1 });
  },

  totalLiability: async () => {
    const result = await CompanyLedger.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);
    let debit = 0, credit = 0;
    result.forEach((r) => {
      if (r._id === "debit") debit = r.total;
      if (r._id === "credit") credit = r.total;
    });
    return { debit, credit, balance: debit - credit };
  },

  paidThisMonth: async (cycleMonth) => {
    const result = await CompanyPayment.aggregate([
      { $match: { cycleMonth } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  paidBetween: async ({ startDate, endDate, cycleMonth } = {}) => {
    const match = {};
    if (cycleMonth) match.cycleMonth = cycleMonth;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    const result = await CompanyPayment.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },
};