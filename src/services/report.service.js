// src/services/report.service.js
import { ledgerService } from "./ledger.service.js";
import { companyService } from "./company.service.js";
import { cashflowService } from "./cashflow.service.js";
import { inventoryService } from "./inventory.service.js";
import { ApiError } from "../utils/ApiError.js";

export const reportService = {
  partyStatement: async (partyId, { startDate, endDate } = {}) => {
    if (!partyId) throw new ApiError(400, "Party ID is required");
    const data = await ledgerService.getPartyLedger(partyId, { startDate, endDate });
    return data;
  },

  monthlySummary: async (month) => {
    // Company ki summary + cash flow summary merge karte hain
    const companyStatement = await companyService.monthlyStatement(month);
    const cashSummary = await cashflowService.cashInHand();
    return {
      month: companyStatement.month,
      totalBilledToCompany: companyStatement.totalDebit,
      totalPaidToCompany: companyStatement.totalCredit,
      collected: cashSummary.collected,
      expenses: cashSummary.expenses,
      cashInHand: cashSummary.cashInHand,
    };
  },

  companySettlement: async (month) => {
    const data = await companyService.monthlyStatement(month);
    return data;
  },

  inventoryReport: async (productId, { startDate, endDate } = {}) => {
    const data = await inventoryService.getMovements(productId, { startDate, endDate });
    return data;
  },
};