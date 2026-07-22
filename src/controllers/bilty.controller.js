import { biltyService } from "../services/bilty.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const biltyController = {
  create: asyncWrapper(async (req, res) => {
    const bilty = await biltyService.createBilty(req.body);
    res.status(201).json(new ApiResponse(201, bilty, "Bilty created"));
  }),

  list: asyncWrapper(async (req, res) => {
    const { party, startDate, endDate } = req.query;
    const bilties = await biltyService.list({ party, startDate, endDate });
    res.status(200).json(new ApiResponse(200, bilties));
  }),

  getById: asyncWrapper(async (req, res) => {
    const bilty = await biltyService.getById(req.params.id);
    res.status(200).json(new ApiResponse(200, bilty));
  }),

  deliveryChargeReport: asyncWrapper(async (req, res) => {
    const { party, startDate, endDate } = req.query;
    const report = await biltyService.deliveryChargeReport({ party, startDate, endDate });
    res.status(200).json(new ApiResponse(200, report));
  }),
};