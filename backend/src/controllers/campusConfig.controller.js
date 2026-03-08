import { CampusConfig } from "../models/campusConfig.model.js";
import {
  findCampusConfigByValue,
  normalizeCampusConfigInput,
} from "../services/campusConfig.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sanitizeCampusConfig = (campusConfig) => {
  if (!campusConfig) {
    return null;
  }

  return {
    id: campusConfig._id,
    campusId: campusConfig.campusId,
    campusName: campusConfig.campusName,
    metadata: campusConfig.metadata,
    transportRules: campusConfig.transportRules,
    operationalSettings: campusConfig.operationalSettings,
    isActive: campusConfig.isActive,
    createdAt: campusConfig.createdAt,
    updatedAt: campusConfig.updatedAt,
  };
};

const createCampusConfig = asyncHandler(async (req, res) => {
  const payload = normalizeCampusConfigInput(req.body, { partial: false });

  const campusConfig = await CampusConfig.create(payload);

  res.status(201).json(
    new ApiResponse(201, sanitizeCampusConfig(campusConfig), "Campus config created successfully"),
  );
});

const listCampusConfigs = asyncHandler(async (req, res) => {
  const { active, search } = req.query;
  const filters = {};

  if (active !== undefined) {
    filters.isActive = String(active).toLowerCase() === "true";
  }

  if (search?.trim()) {
    filters.$or = [
      { campusId: search.trim().toLowerCase() },
      { campusName: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const campusConfigs = await CampusConfig.find(filters).sort({ campusName: 1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: campusConfigs.map(sanitizeCampusConfig),
        total: campusConfigs.length,
      },
      "Campus configs fetched successfully",
    ),
  );
});

const getCampusConfigById = asyncHandler(async (req, res) => {
  const campusConfig = await findCampusConfigByValue(req.params.campusId, {
    includeInactive: true,
  });

  if (!campusConfig) {
    throw new ApiError(404, "Campus config not found");
  }

  res.status(200).json(
    new ApiResponse(200, sanitizeCampusConfig(campusConfig), "Campus config fetched successfully"),
  );
});

const updateCampusConfig = asyncHandler(async (req, res) => {
  const campusConfig = await findCampusConfigByValue(req.params.campusId, {
    includeInactive: true,
  });

  if (!campusConfig) {
    throw new ApiError(404, "Campus config not found");
  }

  const payload = normalizeCampusConfigInput(req.body, {
    partial: true,
    existingConfig: campusConfig,
  });

  Object.assign(campusConfig, payload);
  await campusConfig.save();

  res.status(200).json(
    new ApiResponse(200, sanitizeCampusConfig(campusConfig), "Campus config updated successfully"),
  );
});

const updateCampusTransportRules = asyncHandler(async (req, res) => {
  const campusConfig = await findCampusConfigByValue(req.params.campusId, {
    includeInactive: true,
  });

  if (!campusConfig) {
    throw new ApiError(404, "Campus config not found");
  }

  const payload = normalizeCampusConfigInput(
    { transportRules: req.body.transportRules },
    {
      partial: true,
      existingConfig: campusConfig,
    },
  );

  campusConfig.transportRules = payload.transportRules;
  await campusConfig.save();

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeCampusConfig(campusConfig),
      "Campus transport rules updated successfully",
    ),
  );
});

const updateCampusOperationalSettings = asyncHandler(async (req, res) => {
  const campusConfig = await findCampusConfigByValue(req.params.campusId, {
    includeInactive: true,
  });

  if (!campusConfig) {
    throw new ApiError(404, "Campus config not found");
  }

  const payload = normalizeCampusConfigInput(
    { operationalSettings: req.body.operationalSettings },
    {
      partial: true,
      existingConfig: campusConfig,
    },
  );

  campusConfig.operationalSettings = payload.operationalSettings;
  await campusConfig.save();

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeCampusConfig(campusConfig),
      "Campus operational settings updated successfully",
    ),
  );
});

const listPublicCampuses = asyncHandler(async (_, res) => {
  const campusConfigs = await CampusConfig.find({ isActive: true }).sort({ campusName: 1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: campusConfigs.map(sanitizeCampusConfig),
        total: campusConfigs.length,
      },
      "Campuses fetched successfully",
    ),
  );
});

const getPublicCampusById = asyncHandler(async (req, res) => {
  const campusConfig = await findCampusConfigByValue(req.params.campusId, {
    includeInactive: false,
  });

  if (!campusConfig) {
    throw new ApiError(404, "Campus not found");
  }

  res.status(200).json(
    new ApiResponse(200, sanitizeCampusConfig(campusConfig), "Campus fetched successfully"),
  );
});

export {
  createCampusConfig,
  getCampusConfigById,
  getPublicCampusById,
  listCampusConfigs,
  listPublicCampuses,
  updateCampusConfig,
  updateCampusOperationalSettings,
  updateCampusTransportRules,
};