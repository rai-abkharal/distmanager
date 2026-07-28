import { dashboardService } from "../services/dashboard.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const dashboardController = {
  get: asyncWrapper(async (req, res) => {
    const data = await dashboardService.getDashboard();
    res.status(200).json(new ApiResponse(200, data));
  }),

  summary: asyncWrapper(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await dashboardService.getSummary({ startDate, endDate });
    res.status(200).json(new ApiResponse(200, data));
  }),
};