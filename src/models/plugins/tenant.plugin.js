import mongoose from "mongoose";
import { currentOwnerId } from "../../config/tenant-context.js";

const ownerFilter = () => {
  const ownerId = currentOwnerId();
  return ownerId ? { owner: new mongoose.Types.ObjectId(ownerId) } : null;
};

/** Adds per-account ownership and transparently scopes database operations. */
export const tenantPlugin = (schema) => {
  schema.add({
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Stable device-generated identifier. Unlike Mongo's _id it can be used
    // before a record reaches the server, then safely mapped after sync.
    clientId: { type: String, trim: true, index: true, sparse: true },
    version: { type: Number, default: 1, min: 1 },
  });
  schema.index(
    { owner: 1, clientId: 1 },
    {
      unique: true,
      partialFilterExpression: { clientId: { $type: "string" } },
    }
  );

  schema.pre("validate", function (next) {
    const ownerId = currentOwnerId();
    if (ownerId && !this.owner) this.owner = ownerId;
    next();
  });

  schema.pre("findOneAndUpdate", function (next) {
    this.setUpdate({ ...this.getUpdate(), $inc: { ...(this.getUpdate().$inc || {}), version: 1 } });
    next();
  });

  const scopeQuery = function (next) {
    const filter = ownerFilter();
    if (filter) this.setQuery({ ...this.getQuery(), ...filter });
    next();
  };
  for (const operation of [
    "countDocuments",
    "deleteMany",
    "deleteOne",
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndReplace",
    "findOneAndUpdate",
    "replaceOne",
    "updateMany",
    "updateOne",
  ]) {
    schema.pre(operation, scopeQuery);
  }

  schema.pre("aggregate", function (next) {
    const filter = ownerFilter();
    if (filter) this.pipeline().unshift({ $match: filter });
    next();
  });
};
