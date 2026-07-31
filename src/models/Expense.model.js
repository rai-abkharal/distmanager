import mongoose from "mongoose";
import { tenantPlugin } from "./plugins/tenant.plugin.js";

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

expenseSchema.plugin(tenantPlugin);

export const Expense = mongoose.model("Expense", expenseSchema);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.plugin(tenantPlugin);

export const ExpenseCategory = mongoose.model("ExpenseCategory", categorySchema);
