import mongoose from "mongoose";

const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, index: true },
    openingBalance: { type: Number, default: 0 },
    // currentBalance: +ve = party owes (debit), -ve = credit (CR)
    currentBalance: { type: Number, default: 0, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    lastActiveAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const Party = mongoose.model("Party", partySchema);