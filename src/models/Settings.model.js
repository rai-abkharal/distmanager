import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // "firstMonday" or a fixed day number 1-28
    cycleStartMode: { type: String, enum: ["firstMonday", "fixedDate"], default: "firstMonday" },
    cycleStartDay: { type: Number, default: 1 }, // used when fixedDate
    currency: { type: String, default: "PKR" },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);