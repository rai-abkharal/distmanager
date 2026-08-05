import { productRepository } from "../repositories/product.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { ApiError } from "../utils/ApiError.js";

export const productService = {
  create: async ({ openingStock = 0, ...data }) => {
    const product = await productRepository.create({
      ...data,
      sortOrder: await productRepository.nextSortOrder(),
    });
    // Opening stock is already in the warehouse, so it must not create a
    // company payable. It is nevertheless logged for an auditable balance.
    const stock = await inventoryRepository.adjustStock(product._id, openingStock);
    if (openingStock > 0) {
      await inventoryRepository.addMovement({
        product: product._id,
        direction: "in",
        quantity: openingStock,
        note: "Opening stock",
        balanceAfter: stock.currentStock,
      });
    }
    return product;
  },

  update: async (id, data) => {
    const product = await productRepository.update(id, data);
    if (!product) throw new ApiError(404, "Product not found");
    return product;
  },

  list: () => productRepository.findAll(),

  reorder: async (productIds) => {
    for (let index = 0; index < productIds.length; index += 1) {
      const product = await productRepository.update(productIds[index], { sortOrder: index });
      if (!product) throw new ApiError(404, "Product not found");
    }
  },

  // Calculate free units based on scheme (e.g. 10+1 => enter 20 → 2 free)
  calculateFreeUnits: (product, quantity) => {
    if (!product.scheme?.isActive || !product.scheme.buyQty) return 0;
    const times = Math.floor(quantity / product.scheme.buyQty);
    return times * product.scheme.freeQty;
  },
};
