import { Settings } from "../models/Settings.model.js";

export const settingsRepository = {
  get: async () => {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    return settings;
  },
  update: (data) => Settings.findOneAndUpdate({}, data, { new: true, upsert: true }),
};