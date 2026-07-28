import { cashflowService } from "./cashflow.service.js";
import { partyRepository } from "../repositories/party.repository.js";
import { companyService } from "./company.service.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { biltyRepository } from "../repositories/bilty.repository.js";
import { expenseRepository } from "../repositories/expense.repository.js";

export const dashboardService = {
  getDashboard: async () => {
    const { cashInHand } = await cashflowService.cashInHand();
    const totalReceivables = await partyRepository.totalReceivables();
    const { remaining: companyPayable } = await companyService.getAccountSummary();
    const lowStock = await inventoryRepository.lowStock();

    return {
      cashInHand,
      totalReceivables,
      companyPayable,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.map((i) => ({
        product: i.product?.name,
        currentStock: i.currentStock,
        threshold: i.lowStockThreshold,
      })),
    };
  },

  // Date-filtered business summary: how many bills, their value, delivery
  // charges, payments collected and expenses within the range.
  getSummary: async ({ startDate, endDate } = {}) => {
    const range = { startDate, endDate };
    const { count, total, deliveryCharges } = await biltyRepository.periodStats(range);
    const paymentsCollected = await cashflowService.collectedBetween(range);
    const paymentsCount = await cashflowService.collectedCountBetween(range);
    const expenses = await expenseRepository.total(range);
    return {
      billCount: count,
      billValue: total,
      deliveryCharges,
      paymentsCollected,
      paymentsCount,
      expenses,
      // Net cash movement over the range: what came in minus what went out.
      netCash: paymentsCollected - expenses,
    };
  },
};