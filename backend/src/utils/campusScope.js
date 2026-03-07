import { ApiError } from "./ApiError.js";

const normalizeCampusValue = (value) => String(value || "").trim().toLowerCase();

const sanitizeCampusScope = (scope = {}) => ({
  campusId: String(scope.campusId || "").trim(),
  campusName: String(scope.campusName || "").trim(),
});

const validateCampusScopesInput = (campusScopes) => {
  if (!Array.isArray(campusScopes)) {
    throw new ApiError(400, "campusScopes must be an array");
  }

  const uniqueScopes = new Map();

  for (const rawScope of campusScopes) {
    const scope = sanitizeCampusScope(rawScope);

    if (!scope.campusId && !scope.campusName) {
      throw new ApiError(400, "Each campus scope must include campusId or campusName");
    }

    const uniqueKey = `${normalizeCampusValue(scope.campusId)}::${normalizeCampusValue(scope.campusName)}`;
    if (!uniqueScopes.has(uniqueKey)) {
      uniqueScopes.set(uniqueKey, scope);
    }
  }

  return [...uniqueScopes.values()];
};

const userHasCampusAccess = (user, campus) => {
  const normalizedCampus = normalizeCampusValue(campus);

  if (!normalizedCampus) {
    return false;
  }

  return (user.campusScopes || []).some((scope) => {
    const normalizedCampusId = normalizeCampusValue(scope.campusId);
    const normalizedCampusName = normalizeCampusValue(scope.campusName);

    return normalizedCampus === normalizedCampusId || normalizedCampus === normalizedCampusName;
  });
};

const ensureUserHasCampusAccess = (user, campus, actionLabel) => {
  const normalizedCampus = String(campus || "").trim();

  if (!normalizedCampus) {
    throw new ApiError(400, `campus is required to ${actionLabel}`);
  }

  if (!userHasCampusAccess(user, normalizedCampus)) {
    throw new ApiError(
      403,
      `You do not have campus access to ${actionLabel} tasks for ${normalizedCampus}`,
    );
  }

  return normalizedCampus;
};

export {
  ensureUserHasCampusAccess,
  normalizeCampusValue,
  sanitizeCampusScope,
  userHasCampusAccess,
  validateCampusScopesInput,
};