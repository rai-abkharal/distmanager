import { partyRepository } from "../repositories/party.repository.js";
import { partyService } from "../services/party.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const partyController = {
  create: asyncWrapper(async (req, res) => {
    const party = await partyService.create(req.body);
    res.status(201).json(new ApiResponse(201, party, "Party created"));
  }),

  list: asyncWrapper(async (req, res) => {
    const { search, city, sortBy, includeArchived } = req.query;
    const parties = await partyRepository.findAll({
      search,
      city,
      sortBy,
      includeArchived: includeArchived === "true",
    });
    res.status(200).json(new ApiResponse(200, parties));
  }),

  getById: asyncWrapper(async (req, res) => {
    const party = await partyRepository.findById(req.params.id);
    if (!party) throw new ApiError(404, "Party not found");
    res.status(200).json(new ApiResponse(200, party));
  }),

  update: asyncWrapper(async (req, res) => {
    const party = await partyService.update(req.params.id, req.body);
    if (!party) throw new ApiError(404, "Party not found");
    res.status(200).json(new ApiResponse(200, party, "Party updated"));
  }),

  archive: asyncWrapper(async (req, res) => {
    await partyRepository.archive(req.params.id);
    res.status(200).json(new ApiResponse(200, null, "Party archived"));
  }),

  remove: asyncWrapper(async (req, res) => {
    await partyService.remove(req.params.id);
    res.status(200).json(new ApiResponse(200, null, "Party deleted"));
  }),

  totalReceivables: asyncWrapper(async (req, res) => {
    const total = await partyRepository.totalReceivables();
    res.status(200).json(new ApiResponse(200, { totalReceivables: total }));
  }),
};
