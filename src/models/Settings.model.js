import mongoose from "mongoose";
import { tenantPlugin } from "./plugins/tenant.plugin.js";

const settingsSchema = new mongoose.Schema(
  {
    // "firstMonday" or a fixed day number 1-28
    cycleStartMode: { type: String, enum: ["firstMonday", "fixedDate"], default: "firstMonday" },
    cycleStartDay: { type: Number, default: 1 }, // used when fixedDate
    currency: { type: String, default: "PKR" },
  },
  { timestamps: true }
);

settingsSchema.plugin(tenantPlugin);

export const Settings = mongoose.model("Settings", settingsSchema);
