import { calculateAssignmentExpiryDate } from "../background/taskExpiry.monitor.js";
import { CampusConfig } from "../models/campusConfig.model.js";
import { allowedTransportModes } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeCampusValue } from "../utils/campusScope.js";

const sanitizeString = (value) => String(value || "").trim();

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => sanitizeString(tag)).filter(Boolean))];
};

const normalizeTransportRules = (transportRules = {}, existingRules = {}) => {
  const allowedModesInput =
    transportRules.allowedTransportModes ?? existingRules.allowedTransportModes ?? allowedTransportModes;
  const allowedModes = [...new Set(allowedModesInput.map((mode) => sanitizeString(mode)).filter(Boolean))];

  if (allowedModes.length === 0) {
    throw new ApiError(400, "allowedTransportModes must include at least one transport mode");
  }

  for (const mode of allowedModes) {
    if (!allowedTransportModes.includes(mode)) {
      throw new ApiError(400, "Invalid campus transport mode provided");
    }
  }

  const defaultTransportMode = sanitizeString(
    transportRules.defaultTransportMode ?? existingRules.defaultTransportMode ?? allowedModes[0],
  );

  if (!allowedModes.includes(defaultTransportMode)) {
    throw new ApiError(400, "defaultTransportMode must be included in allowedTransportModes");
  }

  return {
    allowedTransportModes: allowedModes,
    defaultTransportMode,
    notes: sanitizeString(transportRules.notes ?? existingRules.notes),
  };
};

const normalizeOperationalSettings = (settings = {}, existingSettings = {}) => {
  const normalized = {
    isTaskCreationEnabled:
      settings.isTaskCreationEnabled ?? existingSettings.isTaskCreationEnabled ?? true,
    isRunnerAcceptanceEnabled:
      settings.isRunnerAcceptanceEnabled ?? existingSettings.isRunnerAcceptanceEnabled ?? true,
    assignmentExpiryMinutes:
      settings.assignmentExpiryMinutes ?? existingSettings.assignmentExpiryMinutes ?? 15,
    minTaskReward: settings.minTaskReward ?? existingSettings.minTaskReward ?? 0,
    maxTaskReward:
      settings.maxTaskReward === undefined
        ? existingSettings.maxTaskReward ?? null
        : settings.maxTaskReward,
  };

  const assignmentExpiryMinutes = Number(normalized.assignmentExpiryMinutes);
  if (!Number.isFinite(assignmentExpiryMinutes) || assignmentExpiryMinutes < 5 || assignmentExpiryMinutes > 180) {
    throw new ApiError(400, "assignmentExpiryMinutes must be between 5 and 180");
  }

  const minTaskReward = Number(normalized.minTaskReward);
  if (!Number.isFinite(minTaskReward) || minTaskReward < 0) {
    throw new ApiError(400, "minTaskReward must be a non-negative number");
  }

  const maxTaskReward =
    normalized.maxTaskReward === null || normalized.maxTaskReward === ""
      ? null
      : Number(normalized.maxTaskReward);

  if (maxTaskReward !== null && (!Number.isFinite(maxTaskReward) || maxTaskReward < minTaskReward)) {
    throw new ApiError(400, "maxTaskReward must be null or greater than or equal to minTaskReward");
  }

  return {
    isTaskCreationEnabled: Boolean(normalized.isTaskCreationEnabled),
    isRunnerAcceptanceEnabled: Boolean(normalized.isRunnerAcceptanceEnabled),
    assignmentExpiryMinutes,
    minTaskReward,
    maxTaskReward,
  };
};

const normalizeMetadata = (metadata = {}, existingMetadata = {}) => {
  return {
    shortCode: sanitizeString(metadata.shortCode ?? existingMetadata.shortCode),
    timezone: sanitizeString(metadata.timezone ?? existingMetadata.timezone),
    address: sanitizeString(metadata.address ?? existingMetadata.address),
    tags: normalizeTags(metadata.tags ?? existingMetadata.tags ?? []),
  };
};

const normalizeCampusConfigInput = (input, { partial = false, existingConfig = null } = {}) => {
  const campusId = sanitizeString(input.campusId ?? existingConfig?.campusId).toLowerCase();
  const campusName = sanitizeString(input.campusName ?? existingConfig?.campusName);

  if (!partial || input.campusId !== undefined || !existingConfig) {
    if (!campusId) {
      throw new ApiError(400, "campusId is required");
    }
  }

  if (!partial || input.campusName !== undefined || !existingConfig) {
    if (!campusName) {
      throw new ApiError(400, "campusName is required");
    }
  }

  const payload = {};

  if (campusId) {
    payload.campusId = campusId;
  }

  if (campusName) {
    payload.campusName = campusName;
  }

  if (!partial || input.metadata !== undefined) {
    payload.metadata = normalizeMetadata(input.metadata, existingConfig?.metadata || {});
  }

  if (!partial || input.transportRules !== undefined) {
    payload.transportRules = normalizeTransportRules(
      input.transportRules,
      existingConfig?.transportRules || {},
    );
  }

  if (!partial || input.operationalSettings !== undefined) {
    payload.operationalSettings = normalizeOperationalSettings(
      input.operationalSettings,
      existingConfig?.operationalSettings || {},
    );
  }

  if (input.isActive !== undefined || (!partial && existingConfig === null)) {
    payload.isActive = input.isActive === undefined ? true : Boolean(input.isActive);
  }

  return payload;
};

const findCampusConfigByValue = async (value, { includeInactive = false } = {}) => {
  const normalized = normalizeCampusValue(value);

  if (!normalized) {
    return null;
  }

  const query = {
    $or: [{ campusId: normalized }, { campusNameNormalized: normalized }],
  };

  if (!includeInactive) {
    query.isActive = true;
  }

  return CampusConfig.findOne(query);
};

const resolveCampusTaskRules = async ({ campus, transportMode, reward, action }) => {
  const campusConfig = await findCampusConfigByValue(campus, { includeInactive: true });
  const normalizedCampus = campusConfig ? campusConfig.campusName : sanitizeString(campus);
  const requestedTransportMode = sanitizeString(transportMode);

  if (!campusConfig) {
    return {
      campusConfig: null,
      campus: normalizedCampus,
      transportMode: requestedTransportMode || "other",
    };
  }

  if (!campusConfig.isActive) {
    throw new ApiError(403, `Campus ${campusConfig.campusName} is inactive`);
  }

  if (action === "create" && !campusConfig.operationalSettings.isTaskCreationEnabled) {
    throw new ApiError(403, `Task creation is disabled for ${campusConfig.campusName}`);
  }

  if (action === "accept" && !campusConfig.operationalSettings.isRunnerAcceptanceEnabled) {
    throw new ApiError(403, `Runner acceptance is disabled for ${campusConfig.campusName}`);
  }

  const resolvedTransportMode =
    requestedTransportMode || campusConfig.transportRules.defaultTransportMode || "other";

  if (!campusConfig.transportRules.allowedTransportModes.includes(resolvedTransportMode)) {
    throw new ApiError(
      400,
      `${resolvedTransportMode} transport mode is not allowed for ${campusConfig.campusName}`,
    );
  }

  if (action === "create") {
    const numericReward = Number(reward ?? 0);
    const { minTaskReward, maxTaskReward } = campusConfig.operationalSettings;

    if (numericReward < minTaskReward) {
      throw new ApiError(
        400,
        `reward must be at least ${minTaskReward} for ${campusConfig.campusName}`,
      );
    }

    if (maxTaskReward !== null && numericReward > maxTaskReward) {
      throw new ApiError(
        400,
        `reward must be at most ${maxTaskReward} for ${campusConfig.campusName}`,
      );
    }
  }

  return {
    campusConfig,
    campus: campusConfig.campusName,
    transportMode: resolvedTransportMode,
  };
};

const calculateCampusAssignmentExpiryDate = async (campus) => {
  const campusConfig = await findCampusConfigByValue(campus, { includeInactive: false });

  if (!campusConfig) {
    return calculateAssignmentExpiryDate();
  }

  return calculateAssignmentExpiryDate(
    new Date(),
    campusConfig.operationalSettings.assignmentExpiryMinutes * 60 * 1000,
  );
};

export {
  calculateCampusAssignmentExpiryDate,
  findCampusConfigByValue,
  normalizeCampusConfigInput,
  resolveCampusTaskRules,
};