import { CompanyPayment, CompanyLedger } from "../models/CompanyAccount.model.js";

export const companyRepository = {
  addLedgerEntry: (data, session = null) =>
    session ? CompanyLedger.create([data], { session }).then((r) => r[0]) : CompanyLedger.create(data),

  addPayment: (data) => CompanyPayment.create(data),

  payments: ({ cycleMonth } = {}) => {
    const query = {};
    if (cycleMonth) query.cycleMonth = cycleMonth;
    return CompanyPayment.find(query).sort({ date: -1 });
  },

  ledgerByMonth: (cycleMonth) => CompanyLedger.find({ cycleMonth }).sort({ date: 1 }),

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
};