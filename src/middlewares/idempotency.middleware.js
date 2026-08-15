import { IdempotencyKey } from "../models/IdempotencyKey.model.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";

// Replaying an offline request with the same key returns its original result,
// preventing duplicate payments/bills after a connection drops mid-request.
export const idempotency = asyncWrapper(async (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const key = req.get("Idempotency-Key");
  if (!key) return next();
  const path = req.baseUrl + req.path;
  const prior = await IdempotencyKey.findOne({ key });
  if (prior) return res.status(prior.statusCode).json(prior.body);
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    try {
      await IdempotencyKey.create({ key, method: req.method, path, statusCode: res.statusCode, body });
    } catch (error) {
      if (error?.code === 11000) {
        const saved = await IdempotencyKey.findOne({ key });
        if (saved) return originalJson(saved.body);
      }
      throw error;
    }
    return originalJson(body);
  };
  next();
});
