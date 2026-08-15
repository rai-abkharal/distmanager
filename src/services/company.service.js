import { companyRepository } from "../repositories/company.repository.js";
import { StockMovement } from "../models/Inventory.model.js";
import { ApiError } from "../utils/ApiError.js";

// Helper: current cycle month key e.g. "2026-07"
export const getCycleMonthKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const getMedicinesReceived = async ({ startDate, endDate } = {}) => {
  const query = { direction: "in" };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  const movements = await StockMovement.find(query).populate("product").sort({ date: -1 });
  let totalQuantity = 0;
  let totalValue = 0;
  const items = movements.map((m) => {
    const qty = m.quantity || 0;
    const price = m.product?.price || 0;
    const val = qty * price;
    totalQuantity += qty;
    totalValue += val;
    return {
      id: m._id,
      productId: m.product?._id,
      productName: m.product?.name || "Medicine",
      unit: m.product?.unit || "units",
      quantity: qty,
      price,
      value: val,
      date: m.date,
      note: m.note || "Received from company",
      balanceAfter: m.balanceAfter,
    };
  });
  return { totalQuantity, totalValue, items };
};

export const companyService = {
  // Increase liability (stock receipt / bilty)
  addLiability: async ({ amount, source, refId = null, note = "", date }, session = null) => {
    return companyRepository.addLedgerEntry(
      {
        type: "debit",
        amount,
        source,
        refId,
        note,
        date: date || new Date(),
        cycleMonth: getCycleMonthKey(date ? new Date(date) : new Date()),
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
      date: date || new Date(),
      cycleMonth,
    });
    return payment;
  },

  getAccountSummary: async ({ startDate, endDate, month } = {}) => {
    const cycleMonth = month || getCycleMonthKey();
    const { balance } = await companyRepository.totalLiability();
    const paid = (startDate || endDate)
      ? await companyRepository.paidBetween({ startDate, endDate })
      : await companyRepository.paidThisMonth(cycleMonth);
    const medicines = await getMedicinesReceived({ startDate, endDate });
    return {
      totalLiability: balance,
      paidThisCycle: paid,
      remaining: balance,
      totalMedicinesQuantity: medicines.totalQuantity,
      totalMedicinesValue: medicines.totalValue,
      medicinesList: medicines.items,
    };
  },

  monthlyStatement: async ({ startDate, endDate, month } = {}) => {
    const cycleMonth = month || (!startDate && !endDate ? getCycleMonthKey() : null);
    const ledger = await companyRepository.ledgerByRange({ startDate, endDate, cycleMonth });
    const payments = await companyRepository.payments({ cycleMonth, startDate, endDate });
    const medicines = await getMedicinesReceived({ startDate, endDate });
    const debits = ledger.filter((l) => l.type === "debit");
    const credits = ledger.filter((l) => l.type === "credit");
    const totalDebit = debits.reduce((s, l) => s + l.amount, 0);
    const totalCredit = credits.reduce((s, l) => s + l.amount, 0);
    return {
      month: cycleMonth || "Custom",
      debits,
      credits,
      payments,
      medicines: medicines.items,
      totalMedicinesQuantity: medicines.totalQuantity,
      totalMedicinesValue: medicines.totalValue,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
    };
  },
};