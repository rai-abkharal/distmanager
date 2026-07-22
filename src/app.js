import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import v1Routes from "./routes/v1/index.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV === "development") app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// API v1
app.use("/api/v1", v1Routes);

// 404 + error handler (order matters — always last)
app.use(notFound);
app.use(errorHandler);

export default app;