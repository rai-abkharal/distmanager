import { cashflowService, settingsService } from "../services/cashflow.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const cashflowController = {
  addExpense: asyncWrapper(async (req, res) => {
    const expense = await cashflowService.addExpense(req.body);
    res.status(201).json(new ApiResponse(201, expense, "Expense added"));
  }),

  listExpenses: asyncWrapper(async (req, res) => {
    const { startDate, endDate, category } = req.query;
    const expenses = await cashflowService.listExpenses({ startDate, endDate, category });
    res.status(200).json(new ApiResponse(200, expenses));
  }),

  breakdown: asyncWrapper(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await cashflowService.expenseBreakdown({ startDate, endDate });
    res.status(200).json(new ApiResponse(200, data));
  }),

  cashInHand: asyncWrapper(async (req, res) => {
    const data = await cashflowService.cashInHand();
    res.status(200).json(new ApiResponse(200, data));
  }),

  dailySummary: asyncWrapper(async (req, res) => {
    const data = await cashflowService.dailySummary(req.query.date);
    res.status(200).json(new ApiResponse(200, data));
  }),

  categories: asyncWrapper(async (req, res) => {
    const data = await cashflowService.categories();
    res.status(200).json(new ApiResponse(200, data));
  }),

  addCategory: asyncWrapper(async (req, res) => {
    const data = await cashflowService.addCategory(req.body.name);
    res.status(201).json(new ApiResponse(201, data, "Category added"));
  }),

  getSettings: asyncWrapper(async (req, res) => {
    const data = await settingsService.get();
    res.status(200).json(new ApiResponse(200, data));
  }),

  updateSettings: asyncWrapper(async (req, res) => {
    const data = await settingsService.update(req.body);
    res.status(200).json(new ApiResponse(200, data, "Settings updated"));
  }),
};