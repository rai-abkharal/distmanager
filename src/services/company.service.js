import { companyRepository } from "../repositories/company.repository.js";
import { settingsService } from "./cashflow.service.js"; // getCurrentCycleMonth helper below
import { ApiError } from "../utils/ApiError.js";

// Helper: current cycle month key e.g. "2026-07"
export const getCycleMonthKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const companyService = {
  // Increase liability (stock receipt / bilty)
  addLiability: async ({ amount, source, refId = null, note = "" }, session = null) => {
    return companyRepository.addLedgerEntry(
      {
        type: "debit",
        amount,
        source,
        refId,
        note,
        cycleMonth: getCycleMonthKey(),
      },
      session
    );
  },

  // Record payment made to company (reduces liability + reduces cash)
  recordPayment: async ({ amount, mode, reference = "", date }) => {
    if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
    const cycleMonth = getCycleMonthKey(date ? new Date(date) : new Date());

    const payment = await companyRepository.addPayment({ amount, mode, reference, date, cycleMonth });
    await companyRepository.addLedgerEntry({
      type: "credit",
      amount,
      source: "payment",
      refId: payment._id,
      note: `Payment to company (${mode})`,
      cycleMonth,
    });
    return payment;
  },

  getAccountSummary: async () => {
    const cycleMonth = getCycleMonthKey();
    const { balance } = await companyRepository.totalLiability();
    const paidThisMonth = await companyRepository.paidThisMonth(cycleMonth);
    return { totalLiability: balance, paidThisMonth, remaining: balance };
  },

  monthlyStatement: async (cycleMonth) => {
    const month = cycleMonth || getCycleMonthKey();
    const ledger = await companyRepository.ledgerByMonth(month);
    const payments = await companyRepository.payments({ cycleMonth: month });
    const debits = ledger.filter((l) => l.type === "debit");
    const credits = ledger.filter((l) => l.type === "credit");
    const totalDebit = debits.reduce((s, l) => s + l.amount, 0);
    const totalCredit = credits.reduce((s, l) => s + l.amount, 0);
    return { month, debits, credits, payments, totalDebit, totalCredit, balance: totalDebit - totalCredit };
  },
};