import { inventoryService } from "../services/inventory.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const inventoryController = {
  receiveStock: asyncWrapper(async (req, res) => {
    const stock = await inventoryService.receiveStock(req.body);
    res.status(201).json(new ApiResponse(201, stock, "Stock received"));
  }),

  receiveStockBatch: asyncWrapper(async (req, res) => {
    const result = await inventoryService.receiveStockBatch(req.body);
    res.status(201).json(new ApiResponse(201, result, "Stock received"));
  }),

  dispatch: asyncWrapper(async (req, res) => {
    const result = await inventoryService.dispatchToParty(req.body);
    res.status(201).json(new ApiResponse(201, result, "Stock dispatched"));
  }),

  levels: asyncWrapper(async (req, res) => {
    const levels = await inventoryService.getStockLevels();
    res.status(200).json(new ApiResponse(200, levels));
  }),

  movements: asyncWrapper(async (req, res) => {
    const { productId, startDate, endDate } = req.query;
    const movements = await inventoryService.getMovements(productId, { startDate, endDate });
    res.status(200).json(new ApiResponse(200, movements));
  }),

  setThreshold: asyncWrapper(async (req, res) => {
    const result = await inventoryService.setThreshold(req.body);
    res.status(200).json(new ApiResponse(200, result, "Threshold set"));
  }),

  setStock: asyncWrapper(async (req, res) => {
    const result = await inventoryService.setStock(req.body);
    res.status(200).json(new ApiResponse(200, result, "Stock updated"));
  }),

  lowStock: asyncWrapper(async (req, res) => {
    const items = await inventoryService.lowStock();
    res.status(200).json(new ApiResponse(200, items));
  }),
};
