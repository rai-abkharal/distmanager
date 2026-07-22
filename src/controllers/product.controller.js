import { productService } from "../services/product.service.js";
import { productRepository } from "../repositories/product.repository.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const productController = {
  create: asyncWrapper(async (req, res) => {
    const product = await productService.create(req.body);
    res.status(201).json(new ApiResponse(201, product, "Product created"));
  }),

  list: asyncWrapper(async (req, res) => {
    const products = await productService.list();
    res.status(200).json(new ApiResponse(200, products));
  }),

  update: asyncWrapper(async (req, res) => {
    const product = await productService.update(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, product, "Product updated"));
  }),

  archive: asyncWrapper(async (req, res) => {
    await productRepository.archive(req.params.id);
    res.status(200).json(new ApiResponse(200, null, "Product archived"));
  }),

  // Preview free units for a given quantity (scheme calc)
  previewScheme: asyncWrapper(async (req, res) => {
    const product = await productRepository.findById(req.params.id);
    if (!product) throw new ApiError(404, "Product not found");
    const qty = Number(req.query.quantity || 0);
    const freeUnits = productService.calculateFreeUnits(product, qty);
    res.status(200).json(new ApiResponse(200, { quantity: qty, freeUnits }));
  }),
};