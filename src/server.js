import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { migrateLegacyTenantData } from "./services/tenant-migration.service.js";

const startServer = async () => {
  await connectDB();
  await migrateLegacyTenantData();
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("✅ Server closed.");
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Catch unhandled rejections
  process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err);
    server.close(() => process.exit(1));
  });
};

startServer();
