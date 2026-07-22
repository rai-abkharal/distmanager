import mongoose from "mongoose";

// Payments made to company
const companyPaymentSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["online", "cash"], required: true },
    reference: { type: String, default: "" },
    cycleMonth: { type: String, index: true }, // e.g. "2026-07"
  },
  { timestamps: true }
);

export const CompanyPayment = mongoose.model("CompanyPayment", companyPaymentSchema);

// Running liability tracker (single doc)
const companyLedgerSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ["debit", "credit"], required: true }, // debit=stock received/bilty, credit=payment
    amount: { type: Number, required: true },
    source: { type: String, enum: ["stock_receipt", "bilty", "payment"], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, default: "" },
    cycleMonth: { type: String, index: true },
  },
  { timestamps: true }
);

export const CompanyLedger = mongoose.model("CompanyLedger", companyLedgerSchema);