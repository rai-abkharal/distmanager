import { cashflowService } from "./cashflow.service.js";
import { partyRepository } from "../repositories/party.repository.js";
import { companyService } from "./company.service.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";

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
};