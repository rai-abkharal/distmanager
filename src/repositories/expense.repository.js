import { Expense, ExpenseCategory } from "../models/Expense.model.js";

export const expenseRepository = {
  create: (data) => Expense.create(data),

  findAll: ({ startDate, endDate, category } = {}) => {
    const query = {};
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    return Expense.find(query).sort({ date: -1 });
  },

  total: async ({ startDate, endDate } = {}) => {
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    const result = await Expense.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  breakdownByCategory: ({ startDate, endDate } = {}) => {
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    return Expense.aggregate([
      { $match: match },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
  },

  // Categories
  createCategory: (name) => ExpenseCategory.create({ name }),
  allCategories: () => ExpenseCategory.find().sort({ name: 1 }),
};