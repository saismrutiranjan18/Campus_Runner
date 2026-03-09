import { getOrCreateMaintenanceSettings } from "../services/maintenance.service.js";

const createMaintenanceGateMiddleware = (gateKey) => {
  return async (req, res, next) => {
    const settings = await getOrCreateMaintenanceSettings();
    const gate = settings?.[gateKey];

    if (!gate?.enabled) {
      next();
      return;
    }

    res.status(503).json({
      success: false,
      message: gate.reason || `${gateKey} is temporarily unavailable due to maintenance mode`,
      data: {
        gate: gateKey,
        enabled: gate.enabled,
        updatedAt: gate.updatedAt,
      },
    });
  };
};

export { createMaintenanceGateMiddleware };