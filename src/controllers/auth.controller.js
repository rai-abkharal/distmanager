import { authService } from "../services/auth.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const authController = {
  // Public: has an account been created yet?
  status: asyncWrapper(async (req, res) => {
    const result = await authService.status();
    res.status(200).json(new ApiResponse(200, result));
  }),

  setup: asyncWrapper(async (req, res) => {
    const result = await authService.setup(req.body);
    res.status(201).json(new ApiResponse(201, result, "Account created"));
  }),

  login: asyncWrapper(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(new ApiResponse(200, result, "Login successful"));
  }),

  refresh: asyncWrapper(async (req, res) => {
    const result = await authService.refresh(req.body?.token);
    res.status(200).json(new ApiResponse(200, result, "Session renewed"));
  }),

  // Protected: current user from JWT
  me: asyncWrapper(async (req, res) => {
    res.status(200).json(
      new ApiResponse(200, {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
      })
    );
  }),

  changePassword: asyncWrapper(async (req, res) => {
    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    res.status(200).json(new ApiResponse(200, result, "Password updated"));
  }),
};
