import mongoose from "mongoose";
import { tenantPlugin } from "./plugins/tenant.plugin.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "ltr", "pcs", "box"],
    },
    price: { type: Number, required: true, min: 0 },
    // Scheme: buy X, get Y free  => "10+1" means buyQty=10, freeQty=1
    scheme: {
      isActive: { type: Boolean, default: false },
      buyQty: { type: Number, default: 0 },
      freeQty: { type: Number, default: 0 },
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.plugin(tenantPlugin);

export const Product = mongoose.model("Product", productSchema);
