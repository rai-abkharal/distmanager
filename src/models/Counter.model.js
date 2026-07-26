import mongoose from "mongoose";

/**
 * Atomic named counters (e.g. sequential bill numbers).
 * Use with `findOneAndUpdate({_id}, {$inc:{seq:1}}, {new, upsert})` inside a
 * transaction so concurrent creates never collide.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "bilty"
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model("Counter", counterSchema);
