import mongoose from "mongoose";

// Current stock per product
const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
      index: true,
    },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Inventory = mongoose.model("Inventory", inventorySchema);

// Stock movement history
const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    direction: { type: String, enum: ["in", "out"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", default: null },
    date: { type: Date, default: Date.now, index: true },
    note: { type: String, default: "" },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);