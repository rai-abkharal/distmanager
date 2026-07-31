import mongoose from "mongoose";
import { tenantPlugin } from "./plugins/tenant.plugin.js";

const ledgerSchema = new mongoose.Schema(
  {
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
      index: true,
    },
    date: { type: Date, default: Date.now, index: true },
    type: { type: String, enum: ["debit", "credit"], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    // For credit (payment) entries
    paymentMode: { type: String, enum: ["cash", "online", null], default: null },
    // Source of entry for traceability
    source: {
      type: String,
      enum: ["opening", "delivery", "bilty", "payment", "delivery_charge", "manual", "adjustment"],
      default: "manual",
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null }, // bilty/inventory ref
    runningBalance: { type: Number, required: true },
    // Audit trail for edits/deletes
    editReason: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ledgerSchema.index({ party: 1, date: -1 });
ledgerSchema.plugin(tenantPlugin);

export const Ledger = mongoose.model("Ledger", ledgerSchema);
