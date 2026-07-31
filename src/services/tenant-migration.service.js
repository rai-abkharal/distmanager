import { User } from "../models/User.model.js";
import { Party } from "../models/Party.model.js";
import { Product } from "../models/Product.model.js";
import { Ledger } from "../models/Ledger.model.js";
import { Inventory, StockMovement } from "../models/Inventory.model.js";
import { Bilty } from "../models/Bilty.model.js";
import { CompanyLedger, CompanyPayment } from "../models/CompanyAccount.model.js";
import { Expense, ExpenseCategory } from "../models/Expense.model.js";
import { Settings } from "../models/Settings.model.js";

// One-time safe upgrade: shared records created before account isolation belong
// to the oldest account (the original owner). New accounts start with no data.
export const migrateLegacyTenantData = async () => {
  const originalOwner = await User.findOne().sort({ createdAt: 1 }).lean();
  if (!originalOwner) return;
  const models = [
    Party,
    Product,
    Ledger,
    Inventory,
    StockMovement,
    Bilty,
    CompanyLedger,
    CompanyPayment,
    Expense,
    ExpenseCategory,
    Settings,
  ];
  await Promise.all(
    models.map((model) =>
      model.updateMany(
        { $or: [{ owner: { $exists: false } }, { owner: null }] },
        { $set: { owner: originalOwner._id } }
      )
    )
  );
};
