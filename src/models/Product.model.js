import mongoose from "mongoose";
import { tenantPlugin } from "./plugins/tenant.plugin.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "ltr", "g", "ml", "pcs", "box", "bag", "carton"],
    },
    // A pack can be sold as 220 ml, 450 g, etc.  The price remains the price
    // of one pack, while unit describes the pack's measurement.
    packSize: { type: Number, min: 0, default: null },
    price: { type: Number, required: true, min: 0 },
    // Scheme: buy X, get Y free  => "10+1" means buyQty=10, freeQty=1
    scheme: {
      isActive: { type: Boolean, default: false },
      buyQty: { type: Number, default: 0 },
      freeQty: { type: Number, default: 0 },
    },
    isArchived: { type: Boolean, default: false },
    // User-controlled catalogue order.  Existing products without this value
    // continue to work and are placed after explicitly ordered products.
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

productSchema.plugin(tenantPlugin);

export const Product = mongoose.model("Product", productSchema);
