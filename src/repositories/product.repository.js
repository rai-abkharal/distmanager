import { Product } from "../models/Product.model.js";

export const productRepository = {
  create: (data) => Product.create(data),
  findById: (id) => Product.findById(id),
  findAll: (includeArchived = false) =>
    Product.find(includeArchived ? {} : { isArchived: false }).sort({ sortOrder: 1, name: 1 }),
  update: (id, data) => Product.findByIdAndUpdate(id, data, { new: true }),
  archive: (id) => Product.findByIdAndUpdate(id, { isArchived: true }, { new: true }),
  nextSortOrder: async () => {
    const last = await Product.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean();
    return (last?.sortOrder ?? -1) + 1;
  },
};
