import { getOrCreateMaintenanceSettings, maintenanceGateKeys, normalizeMaintenancePayload } from "../services/maintenance.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sanitizeGate = (gate) => ({
  enabled: Boolean(gate?.enabled),
  reason: gate?.reason || "",
  updatedAt: gate?.updatedAt || null,
  updatedBy: gate?.updatedBy
    ? {
        id: gate.updatedBy._id,
        fullName: gate.updatedBy.fullName,
        email: gate.updatedBy.email,
        role: gate.updatedBy.role,
      }
    : null,
});

const sanitizeMaintenanceSettings = (settings) => ({
  registration: sanitizeGate(settings.registration),
  taskCreation: sanitizeGate(settings.taskCreation),
  walletMutations: sanitizeGate(settings.walletMutations),
  updatedAt: settings.updatedAt,
});

const getMaintenanceSettings = asyncHandler(async (_req, res) => {
  const settings = await getOrCreateMaintenanceSettings();
  await settings.populate([
    { path: "registration.updatedBy", select: "fullName email role" },
    { path: "taskCreation.updatedBy", select: "fullName email role" },
    { path: "walletMutations.updatedBy", select: "fullName email role" },
  ]);

  res.status(200).json(
    new ApiResponse(200, sanitizeMaintenanceSettings(settings), "Maintenance settings fetched successfully"),
  );
});

const updateMaintenanceSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateMaintenanceSettings();
  const normalizedPayload = normalizeMaintenancePayload(req.body);

  for (const gateKey of maintenanceGateKeys) {
    if (!normalizedPayload[gateKey]) {
      continue;
    }

    settings[gateKey].enabled = normalizedPayload[gateKey].enabled;
    settings[gateKey].reason = normalizedPayload[gateKey].reason;
    settings[gateKey].updatedAt = new Date();
    settings[gateKey].updatedBy = req.user._id;
  }

  await settings.save();
  await settings.populate([
    { path: "registration.updatedBy", select: "fullName email role" },
    { path: "taskCreation.updatedBy", select: "fullName email role" },
    { path: "walletMutations.updatedBy", select: "fullName email role" },
  ]);

  res.status(200).json(
    new ApiResponse(200, sanitizeMaintenanceSettings(settings), "Maintenance settings updated successfully"),
  );
});

export { getMaintenanceSettings, updateMaintenanceSettings };