import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { tenantContext } from "../config/tenant-context.js";

export const protect = asyncWrapper(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    tenantContext.run({ ownerId: decoded.id }, next);
  } catch (error) {
    throw new ApiError(401, "Not authorized, token invalid or expired");
  }
});
