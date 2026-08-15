import { expenseRepository } from "../repositories/expense.repository.js";
import { companyRepository } from "../repositories/company.repository.js";
import { Ledger } from "../models/Ledger.model.js";
import { ExpenseCategory } from "../models/Expense.model.js";
import { settingsRepository } from "../repositories/settings.repository.js";
import { ApiError } from "../utils/ApiError.js";

// Total collected from parties (all credit payments)
const totalCollected = async ({ startDate, endDate } = {}) => {
  const match = { type: "credit", source: "payment", isDeleted: false };
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }
  const result = await Ledger.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total || 0;
};

const totalSentToCompany = async () => {
  const payments = await companyRepository.payments();
  return payments.reduce((s, p) => s + p.amount, 0);
};

// How many payment entries were recorded in a date range (dashboard summary).
const countCollected = async ({ startDate, endDate } = {}) => {
  const match = { type: "credit", source: "payment", isDeleted: false };
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }
  return Ledger.countDocuments(match);
};

export const cashflowService = {
  addExpense: async ({ amount, category, note, date }) => {
    if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
    if (!category) throw new ApiError(400, "Category is required");
    return expenseRepository.create({ amount, category, note, date });
  },

  listExpenses: (filters) => expenseRepository.findAll(filters),
  expenseBreakdown: (filters) => expenseRepository.breakdownByCategory(filters),

  categories: async () => {
    const list = await expenseRepository.allCategories();
    if (list.length === 0) {
      const defaults = [
        "Fuel",
        "Warehouse Rent",
        "Food & Tea",
        "Utilities",
        "Transport",
        "Maintenance",
        "Labor",
        "General",
      ];
      const seeded = [];
      for (const name of defaults) {
        try {
          const cat = await ExpenseCategory.create({ name, isDefault: true });
          seeded.push(cat);
        } catch (_) {}
      }
      return seeded.length > 0 ? seeded : list;
    }
    return list;
  },

  addCategory: async (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) throw new ApiError(400, "Category name is required");
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await ExpenseCategory.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, "i") },
    });
    if (existing) {
      return existing; // idempotent success, prevents 409 duplicate errors
    }
    return expenseRepository.createCategory(trimmed);
  },

  updateExpense: async (id, data) => {
    if (data.amount != null && data.amount <= 0)
      throw new ApiError(400, "Amount must be greater than 0");
    const expense = await expenseRepository.update(id, data);
    if (!expense) throw new ApiError(404, "Expense not found");
    return expense;
  },

  deleteExpense: async (id) => {
    const expense = await expenseRepository.remove(id);
    if (!expense) throw new ApiError(404, "Expense not found");
  },

  // Payments collected from parties within a date range (dashboard summary).
  collectedBetween: ({ startDate, endDate } = {}) =>
    totalCollected({ startDate, endDate }),

  // Number of payments collected within a date range (dashboard summary).
  collectedCountBetween: ({ startDate, endDate } = {}) =>
    countCollected({ startDate, endDate }),

  // Live Cash in Hand = Collected − Expenses − Sent to Company
  cashInHand: async () => {
    const collected = await totalCollected();
    const expenses = await expenseRepository.total();
    const sentToCompany = await totalSentToCompany();
    return {
      collected,
      expenses,
      sentToCompany,
      cashInHand: collected - expenses - sentToCompany,
    };
  },

  dailySummary: async (date) => {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day.setHours(0, 0, 0, 0));
    const end = new Date(day.setHours(23, 59, 59, 999));
    const collected = await totalCollected({ startDate: start, endDate: end });
    const expenses = await expenseRepository.total({
      startDate: start,
      endDate: end,
    });
    return { date: start, collected, expenses };
  },
};

export const settingsService = {
  get: () => settingsRepository.get(),
  update: (data) => settingsRepository.update(data),
};
