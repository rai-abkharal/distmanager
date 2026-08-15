import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    // Reconcile and rebuild any changed indexes (e.g. partialFilterExpression)
    for (const name of Object.keys(mongoose.models)) {
      try {
        await mongoose.models[name].syncIndexes();
      } catch (_) {}
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};