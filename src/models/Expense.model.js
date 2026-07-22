import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Expense = mongoose.model("Expense", expenseSchema);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ExpenseCategory = mongoose.model("ExpenseCategory", categorySchema);