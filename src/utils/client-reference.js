import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

/// Resolve a normal Mongo id or an offline client UUID, always within the
/// authenticated tenant because the model's tenant plugin scopes the query.
export const resolveReference = async (Model, id, clientId, label) => {
  if (id && mongoose.isValidObjectId(id)) {
    const record = await Model.findById(id);
    if (record) return record;
  }
  const checkClientId = clientId || (id && !mongoose.isValidObjectId(id) ? id : null);
  if (checkClientId) {
    const record = await Model.findOne({ clientId: checkClientId });
    if (record) return record;
  }
  throw new ApiError(409, `${label} is waiting to sync. Retry after its dependency syncs.`);
};
