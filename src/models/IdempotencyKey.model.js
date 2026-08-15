import mongoose from "mongoose";
import { tenantPlugin } from "./plugins/tenant.plugin.js";

const schema = new mongoose.Schema({
  key: { type: String, required: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  body: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

schema.plugin(tenantPlugin);
schema.index({ owner: 1, key: 1 }, { unique: true });
export const IdempotencyKey = mongoose.model("IdempotencyKey", schema);
