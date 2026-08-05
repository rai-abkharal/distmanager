import { ledgerService } from "../services/ledger.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const ledgerController = {
  recordPayment: asyncWrapper(async (req, res) => {
    const entry = await ledgerService.recordPayment(req.body);
    res.status(201).json(new ApiResponse(201, entry, "Payment recorded"));
  }),

  manualEntry: asyncWrapper(async (req, res) => {
    const entry = await ledgerService.manualEntry(req.body);
    res.status(201).json(new ApiResponse(201, entry, "Ledger entry created"));
  }),

  editEntry: asyncWrapper(async (req, res) => {
    const entry = await ledgerService.editEntry(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, entry, "Entry updated"));
  }),

  getPartyLedger: asyncWrapper(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await ledgerService.getPartyLedger(req.params.partyId, { startDate, endDate });
    res.status(200).json(new ApiResponse(200, data));
  }),

  listPayments: asyncWrapper(async (req, res) => {
    const { startDate, endDate, party } = req.query;
    const payments = await ledgerService.listPayments({ startDate, endDate, party });
    res.status(200).json(new ApiResponse(200, payments));
  }),

  deleteEntry: asyncWrapper(async (req, res) => {
    const result = await ledgerService.deleteEntry(req.params.id, req.body.reason);
    res.status(200).json(new ApiResponse(200, result, "Entry deleted"));
  }),
};
