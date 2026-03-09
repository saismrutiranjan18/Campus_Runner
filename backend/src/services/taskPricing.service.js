import {
  Task,
  allowedCampusZones,
  allowedUrgencyLevels,
} from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";

const PRICING_ENGINE_VERSION = "v1";
const PRICING_CURRENCY = "INR";
const BASE_FEE = 20;
const DISTANCE_RATE_PER_KM = 8;

const urgencyMultiplierByLevel = {
  standard: 1,
  priority: 1.25,
  express: 1.5,
};

const campusZoneSurchargeByZone = {
  central: 0,
  academic: 4,
  residential: 6,
  perimeter: 10,
  remote: 16,
  other: 0,
};

const roundCurrency = (value) => Math.round(value * 100) / 100;

const normalizeOptionalNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative number`);
  }

  return normalizedValue;
};

const normalizePricingInput = ({
  distanceKm,
  urgencyLevel,
  requestedTimeWindowMinutes,
  campusZone,
}) => {
  const normalizedDistanceKm = normalizeOptionalNumber(distanceKm, "distanceKm");
  const normalizedUrgencyLevel = urgencyLevel ? String(urgencyLevel).trim() : "standard";
  const normalizedTimeWindow = normalizeOptionalNumber(
    requestedTimeWindowMinutes,
    "requestedTimeWindowMinutes",
  );
  const normalizedCampusZone = campusZone ? String(campusZone).trim() : "other";

  if (!allowedUrgencyLevels.includes(normalizedUrgencyLevel)) {
    throw new ApiError(400, "Invalid urgencyLevel provided");
  }

  if (!allowedCampusZones.includes(normalizedCampusZone)) {
    throw new ApiError(400, "Invalid campusZone provided");
  }

  return {
    distanceKm: normalizedDistanceKm ?? 0,
    urgencyLevel: normalizedUrgencyLevel,
    requestedTimeWindowMinutes: normalizedTimeWindow,
    campusZone: normalizedCampusZone,
  };
};

const getTimeWindowSurcharge = (requestedTimeWindowMinutes) => {
  if (requestedTimeWindowMinutes === null) {
    return 0;
  }

  if (requestedTimeWindowMinutes <= 30) {
    return 25;
  }

  if (requestedTimeWindowMinutes <= 60) {
    return 15;
  }

  if (requestedTimeWindowMinutes <= 120) {
    return 8;
  }

  return 0;
};

const getDemandAdjustmentRate = (openTaskCount) => {
  return Math.min(openTaskCount, 10) * 0.03;
};

const calculateDemandOpenTaskCount = async ({ campus, campusZone }) => {
  const filters = {
    status: "open",
    isArchived: false,
  };

  if (campus?.trim()) {
    filters.campus = campus.trim();
  }

  if (campusZone && campusZone !== "other") {
    filters.campusZone = campusZone;
  }

  return Task.countDocuments(filters);
};

const createManualPricingSnapshot = ({
  reward,
  transportMode = "other",
  distanceKm = 0,
  urgencyLevel = "standard",
  requestedTimeWindowMinutes = null,
  campusZone = "other",
}) => {
  const total = roundCurrency(Number(reward || 0));

  return {
    mode: "manual",
    engineVersion: PRICING_ENGINE_VERSION,
    currency: PRICING_CURRENCY,
    quotedAt: new Date(),
    distanceKm,
    urgencyLevel,
    requestedTimeWindowMinutes,
    campusZone,
    demandOpenTaskCount: 0,
    components: {
      manualReward: total,
      transportMode,
    },
    total,
  };
};

const generateTaskPricingQuote = async ({
  campus,
  distanceKm,
  urgencyLevel,
  requestedTimeWindowMinutes,
  campusZone,
}) => {
  const normalizedInput = normalizePricingInput({
    distanceKm,
    urgencyLevel,
    requestedTimeWindowMinutes,
    campusZone,
  });

  if (normalizedInput.distanceKm <= 0) {
    throw new ApiError(400, "distanceKm must be greater than zero for dynamic pricing");
  }

  const distanceFee = roundCurrency(normalizedInput.distanceKm * DISTANCE_RATE_PER_KM);
  const zoneSurcharge = campusZoneSurchargeByZone[normalizedInput.campusZone] || 0;
  const timeWindowSurcharge = getTimeWindowSurcharge(normalizedInput.requestedTimeWindowMinutes);
  const subtotalBeforeUrgency = BASE_FEE + distanceFee + zoneSurcharge + timeWindowSurcharge;
  const urgencyMultiplier = urgencyMultiplierByLevel[normalizedInput.urgencyLevel] || 1;
  const urgencySurcharge = roundCurrency(subtotalBeforeUrgency * (urgencyMultiplier - 1));
  const demandOpenTaskCount = await calculateDemandOpenTaskCount({
    campus,
    campusZone: normalizedInput.campusZone,
  });
  const demandRate = getDemandAdjustmentRate(demandOpenTaskCount);
  const demandSurcharge = roundCurrency(
    (subtotalBeforeUrgency + urgencySurcharge) * demandRate,
  );
  const total = roundCurrency(
    subtotalBeforeUrgency + urgencySurcharge + demandSurcharge,
  );

  return {
    mode: "dynamic",
    engineVersion: PRICING_ENGINE_VERSION,
    currency: PRICING_CURRENCY,
    quotedAt: new Date(),
    distanceKm: normalizedInput.distanceKm,
    urgencyLevel: normalizedInput.urgencyLevel,
    requestedTimeWindowMinutes: normalizedInput.requestedTimeWindowMinutes,
    campusZone: normalizedInput.campusZone,
    demandOpenTaskCount,
    components: {
      baseFee: BASE_FEE,
      distanceFee,
      zoneSurcharge,
      timeWindowSurcharge,
      urgencyMultiplier,
      urgencySurcharge,
      demandRate: roundCurrency(demandRate),
      demandSurcharge,
    },
    total,
  };
};

const hasDynamicPricingInput = ({ distanceKm, urgencyLevel, requestedTimeWindowMinutes, campusZone }) => {
  return [distanceKm, urgencyLevel, requestedTimeWindowMinutes, campusZone].some(
    (value) => value !== undefined,
  );
};

export {
  createManualPricingSnapshot,
  generateTaskPricingQuote,
  hasDynamicPricingInput,
};