import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const apply = process.argv.includes("--apply");
const uri = process.env.MONGO_URI;
if (!uri) throw new Error("MONGO_URI is not configured");

await mongoose.connect(uri);

const Party = mongoose.model(
  "Party",
  new mongoose.Schema({}, { strict: false, collection: "parties" })
);
const Ledger = mongoose.model(
  "Ledger",
  new mongoose.Schema({}, { strict: false, collection: "ledgers" })
);

try {
  const parties = await Party.find({ isArchived: true }).select("_id name").lean();
  const partyIds = parties.map((party) => party._id);
  const ledgerFilter = { party: { $in: partyIds }, isDeleted: false };
  const [entries, payments] = await Promise.all([
    Ledger.countDocuments(ledgerFilter),
    Ledger.aggregate([
      { $match: { ...ledgerFilter, source: "payment", type: "credit" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);
  const paymentTotal = payments[0]?.total || 0;
  const paymentCount = payments[0]?.count || 0;

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    archivedParties: parties.length,
    liveLedgerEntries: entries,
    paymentsToExclude: paymentCount,
    paymentAmountToExclude: paymentTotal,
  }));

  if (apply && partyIds.length) {
    await Ledger.updateMany(ledgerFilter, {
      $set: { isDeleted: true, editReason: "Archived party cleanup" },
    });
    await Party.updateMany({ _id: { $in: partyIds } }, { $set: { currentBalance: 0 } });
  }
} finally {
  await mongoose.disconnect();
}
