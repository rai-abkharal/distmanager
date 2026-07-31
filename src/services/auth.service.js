import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const generateToken = (user) =>
  jwt.sign({ id: user._id, name: user.name, username: user.username }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
});

export const authService = {
  // Single-user setup (V1) — creates the account if none exists
  setup: async ({ name, username, password }) => {
    const usernameTaken = await User.findOne({ username: username.toLowerCase() });
    if (usernameTaken) throw new ApiError(409, "Username already taken");

    const user = await User.create({ name, username, password });
    return { user: publicUser(user), token: generateToken(user) };
  },

  login: async ({ username, password }) => {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) throw new ApiError(401, "Invalid username or password");

    const match = await user.comparePassword(password);
    if (!match) throw new ApiError(401, "Invalid username or password");

    return { user: publicUser(user), token: generateToken(user) };
  },

  // The app can renew a signed but expired access token without interrupting a
  // legitimate user's work. A tampered token still fails signature validation.
  refresh: async (token) => {
    if (!token) throw new ApiError(401, "Not authorized, no token provided");
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true });
    } catch (_) {
      throw new ApiError(401, "Not authorized, token invalid");
    }
    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, "User not found");
    return { user: publicUser(user), token: generateToken(user) };
  },

  // Whether an account has been created yet (drives setup vs login on the client)
  status: async () => {
    const user = await User.findOne();
    return { isSetup: !!user, name: user?.name ?? null, username: user?.username ?? null };
  },

  changePassword: async ({ userId, currentPassword, newPassword }) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const match = await user.comparePassword(currentPassword);
    if (!match) throw new ApiError(401, "Current password is incorrect");

    user.password = newPassword;
    await user.save();
    return { updated: true };
  },
};
