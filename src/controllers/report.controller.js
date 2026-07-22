import { ledgerService } from "../services/ledger.service.js";
import { companyService } from "../services/company.service.js";
import { cashflowService } from "../services/cashflow.service.js";
import { inventoryService } from "../services/inventory.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const reportController = {
  // Party statement (data for PDF generation on client / or plug a PDF lib here)
  partyStatement: asyncWrapper(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await ledgerService.getPartyLedger(req.params.partyId, { startDate, endDate });
    res.status(200).json(new ApiResponse(200, data, "Party statement"));
  }),

  monthlySummary: asyncWrapper(async (req, res) => {
    const month = req.query.month;
    const company = await companyService.monthlyStatement(month);
    const cash = await cashflowService.cashInHand();
    res.status(200).json(
      new ApiResponse(200, {
        month: company.month,
        totalBilledToCompany: company.totalDebit,
        totalPaidToCompany: company.totalCredit,
        collected: cash.collected,
        expenses: cash.expenses,
        cashInHand: cash.cashInHand,
      })
    );
  }),

  companySettlement: asyncWrapper(async (req, res) => {
    const data = await companyService.monthlyStatement(req.query.month);
    res.status(200).json(new ApiResponse(200, data));
  }),

  inventoryReport: asyncWrapper(async (req, res) => {
    const { productId, startDate, endDate } = req.query;
    const data = await inventoryService.getMovements(productId, { startDate, endDate });
    res.status(200).json(new ApiResponse(200, data));
  }),
};