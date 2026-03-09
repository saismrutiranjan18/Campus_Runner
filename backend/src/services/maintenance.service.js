import { MaintenanceSetting } from "../models/maintenanceSetting.model.js";

const maintenanceGateKeys = ["registration", "taskCreation", "walletMutations"];

const defaultGateState = () => ({
  enabled: false,
  reason: "",
  updatedAt: null,
  updatedBy: null,
});

const getOrCreateMaintenanceSettings = async () => {
  let settings = await MaintenanceSetting.findOne({ scope: "global" });

  if (!settings) {
    settings = await MaintenanceSetting.create({ scope: "global" });
  }

  return settings;
};

const normalizeMaintenancePayload = (payload = {}) => {
  const normalized = {};

  for (const gateKey of maintenanceGateKeys) {
    if (payload[gateKey] === undefined) {
      continue;
    }

    normalized[gateKey] = {
      enabled: Boolean(payload[gateKey]?.enabled),
      reason: String(payload[gateKey]?.reason || "").trim(),
    };
  }

  return normalized;
};

export { defaultGateState, getOrCreateMaintenanceSettings, maintenanceGateKeys, normalizeMaintenancePayload };