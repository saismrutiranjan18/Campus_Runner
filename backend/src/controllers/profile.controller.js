import { User, allowedRoles } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const isValidPhoneNumber = (value) => {
  if (value === "") return true;
  return /^\+?[0-9\s-]{8,15}$/.test(value);
};

const ensureValidUserId = (userId) => {
  if (!User.base.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId");
  }
};

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  campusId: user.campusId,
  campusName: user.campusName,
  campusScopes: (user.campusScopes || []).map((scope) => ({
    campusId: scope.campusId,
    campusName: scope.campusName,
  })),
  role: user.role,
  isVerified: user.isVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getMyProfile = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(req.user), "Profile fetched successfully"));
});

const getUserProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureValidUserId(userId);

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(user), "User profile fetched successfully"));
});

const listProfiles = asyncHandler(async (req, res) => {
  const { role, verified, active, campusId, search } = req.query;

  const query = {};

  if (role) {
    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, "Invalid role filter");
    }
    query.role = role;
  }

  if (verified !== undefined) {
    query.isVerified = verified === "true";
  }

  if (active !== undefined) {
    query.isActive = active === "true";
  }

  if (campusId) {
    query.campusId = campusId;
  }

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query).sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: users.length,
        users: users.map(sanitizeUser),
      },
      "Profiles fetched successfully",
    ),
  );
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, campusId, campusName } = req.body;

  const updates = {};

  if (fullName !== undefined) {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      throw new ApiError(400, "fullName must be at least 2 characters long");
    }
    updates.fullName = trimmedName;
  }

  if (phoneNumber !== undefined) {
    const normalizedPhone = phoneNumber.trim();
    if (!isValidPhoneNumber(normalizedPhone)) {
      throw new ApiError(400, "Invalid phone number format");
    }
    updates.phoneNumber = normalizedPhone;
  }

  if (campusId !== undefined) {
    updates.campusId = campusId.trim();
  }

  if (campusName !== undefined) {
    updates.campusName = campusName.trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "Nothing to update");
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(updatedUser), "Profile updated successfully"));
});

const updateUserProfileByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { fullName, phoneNumber, campusId, campusName, role, isVerified, isActive } =
    req.body;

  ensureValidUserId(userId);

  const updates = {};

  if (fullName !== undefined) {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      throw new ApiError(400, "fullName must be at least 2 characters long");
    }
    updates.fullName = trimmedName;
  }

  if (phoneNumber !== undefined) {
    const normalizedPhone = phoneNumber.trim();
    if (!isValidPhoneNumber(normalizedPhone)) {
      throw new ApiError(400, "Invalid phone number format");
    }
    updates.phoneNumber = normalizedPhone;
  }

  if (campusId !== undefined) {
    updates.campusId = campusId.trim();
  }

  if (campusName !== undefined) {
    updates.campusName = campusName.trim();
  }

  if (role !== undefined) {
    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, "Invalid role provided");
    }
    updates.role = role;
  }

  if (isVerified !== undefined) {
    updates.isVerified = Boolean(isVerified);
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "Nothing to update");
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(200, sanitizeUser(updatedUser), "User profile updated successfully"),
  );
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  ensureValidUserId(userId);

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role provided");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(updatedUser), "User role updated successfully"));
});

const updateUserVerificationStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isVerified } = req.body;

  ensureValidUserId(userId);

  if (typeof isVerified !== "boolean") {
    throw new ApiError(400, "isVerified must be a boolean");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { isVerified },
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeUser(updatedUser),
      "User verification status updated successfully",
    ),
  );
});

const updateUserActiveStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  ensureValidUserId(userId);

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean");
  }

  const updatePayload = { isActive };
  if (!isActive) {
    updatePayload.refreshToken = null;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeUser(updatedUser),
      `User ${isActive ? "activated" : "deactivated"} successfully`,
    ),
  );
});

const deleteUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  ensureValidUserId(userId);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      isActive: false,
      refreshToken: null,
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(updatedUser), "User soft deleted successfully"));
});

export {
  sanitizeUser,
  deleteUserProfile,
  getMyProfile,
  getUserProfileById,
  listProfiles,
  updateMyProfile,
  updateUserActiveStatus,
  updateUserProfileByAdmin,
  updateUserRole,
  updateUserVerificationStatus,
};