import { ApiError } from "../utils/ApiError.js";

// Validates req.body / req.params / req.query against a zod schema
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    req.body = parsed.body ?? req.body;
    next();
  } catch (err) {
    const details = err.errors?.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    next(new ApiError(400, "Validation failed", details));
  }
};