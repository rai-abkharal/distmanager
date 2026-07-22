import mongoose from "mongoose";

const biltyItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    freeQuantity: { type: Number, default: 0 },
    pricePerUnit: { type: Number, required: true },
    lineValue: { type: Number, required: true }, // quantity * price
  },
  { _id: false }
);

const biltySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, index: true },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
      index: true,
    },
    items: [biltyItemSchema],
    productValue: { type: Number, required: true }, // sum of lineValues
    // true  = direct shipment from company (adds to company payable, stock untouched)
    // false = goods come out of my own inventory (stock decreases, no payable)
    fromCompany: { type: Boolean, default: true },
    hasDeliveryCharge: { type: Boolean, default: false },
    deliveryCharge: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "settled"], default: "open" },
  },
  { timestamps: true }
);

export const Bilty = mongoose.model("Bilty", biltySchema);