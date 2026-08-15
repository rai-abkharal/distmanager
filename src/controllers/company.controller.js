import { companyService } from "../services/company.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const companyController = {
  recordPayment: asyncWrapper(async (req, res) => {
    const payment = await companyService.recordPayment(req.body);
    res.status(201).json(new ApiResponse(201, payment, "Company payment recorded"));
  }),

  summary: asyncWrapper(async (req, res) => {
    const { startDate, endDate, month } = req.query;
    const summary = await companyService.getAccountSummary({ startDate, endDate, month });
    res.status(200).json(new ApiResponse(200, summary));
  }),

  monthlyStatement: asyncWrapper(async (req, res) => {
    const { startDate, endDate, month } = req.query;
    const statement = await companyService.monthlyStatement({ startDate, endDate, month });
    res.status(200).json(new ApiResponse(200, statement));
  }),
};