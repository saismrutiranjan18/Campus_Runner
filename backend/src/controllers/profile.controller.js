import { User, allowedRoles } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
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

const updateMyProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber } = req.body;

  const updates = {};
  if (fullName) updates.fullName = fullName.trim();
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber.trim();

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

const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

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

export { getMyProfile, updateMyProfile, updateUserRole };