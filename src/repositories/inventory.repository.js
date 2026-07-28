import { Inventory, StockMovement } from "../models/Inventory.model.js";

export const inventoryRepository = {
  createStock: (data) => Inventory.create(data),
  findByProduct: (productId, session = null) =>
    Inventory.findOne({ product: productId }).session(session),
  findAll: () => Inventory.find().populate("product"),

  adjustStock: (productId, delta, session = null) =>
    Inventory.findOneAndUpdate(
      { product: productId },
      { $inc: { currentStock: delta } },
      { new: true, upsert: true, session }
    ),

  setThreshold: (productId, threshold) =>
    Inventory.findOneAndUpdate({ product: productId }, { lowStockThreshold: threshold }, { new: true }),

  lowStock: () =>
    Inventory.find({ $expr: { $lte: ["$currentStock", "$lowStockThreshold"] } }).populate("product"),

  addMovement: (data, session = null) =>
    session ? StockMovement.create([data], { session }).then((r) => r[0]) : StockMovement.create(data),

  movements: (productId, { startDate, endDate } = {}) => {
    const query = {};
    if (productId) query.product = productId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    return StockMovement.find(query).populate("product party").sort({ date: -1 });
  },
};