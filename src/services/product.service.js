import { productRepository } from "../repositories/product.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { ApiError } from "../utils/ApiError.js";

export const productService = {
  create: async (data) => {
    const product = await productRepository.create(data);
    // initialise inventory record
    await inventoryRepository.adjustStock(product._id, 0);
    return product;
  },

  update: async (id, data) => {
    const product = await productRepository.update(id, data);
    if (!product) throw new ApiError(404, "Product not found");
    return product;
  },

  list: () => productRepository.findAll(),

  // Calculate free units based on scheme (e.g. 10+1 => enter 20 → 2 free)
  calculateFreeUnits: (product, quantity) => {
    if (!product.scheme?.isActive || !product.scheme.buyQty) return 0;
    const times = Math.floor(quantity / product.scheme.buyQty);
    return times * product.scheme.freeQty;
  },
};