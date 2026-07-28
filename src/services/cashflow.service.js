import { expenseRepository } from "../repositories/expense.repository.js";
import { companyRepository } from "../repositories/company.repository.js";
import { Ledger } from "../models/Ledger.model.js";
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
  categories: () => expenseRepository.allCategories(),
  addCategory: (name) => expenseRepository.createCategory(name),

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
    const expenses = await expenseRepository.total({ startDate: start, endDate: end });
    return { date: start, collected, expenses };
  },
};

export const settingsService = {
  get: () => settingsRepository.get(),
  update: (data) => settingsRepository.update(data),
};