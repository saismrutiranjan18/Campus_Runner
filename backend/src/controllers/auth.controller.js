import jwt from "jsonwebtoken";

import { User, allowedRoles } from "../models/user.model.js";
import { createReferralAttribution } from "../services/referral.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  campusId: user.campusId,
  campusName: user.campusName,
  inviteCode: user.inviteCode,
  role: user.role,
  isVerified: user.isVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId).select("+refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found while generating tokens");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, phoneNumber, campusId, campusName, role, inviteCode } =
    req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "fullName, email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  if (role && !allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role provided");
  }

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    phoneNumber: phoneNumber?.trim() || "",
    campusId: campusId?.trim() || "",
    campusName: campusName?.trim() || "",
    role: role || "requester",
  });

  let referral = null;
  if (inviteCode) {
    referral = await createReferralAttribution({
      inviteCode,
      inviteeId: user._id,
      attributionSource: "register",
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const createdUser = await User.findById(user._id);

  res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: sanitizeUser(createdUser),
          referral,
          accessToken,
          refreshToken,
        },
        "User registered successfully",
      ),
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password +refreshToken",
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await User.findById(user._id);

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: sanitizeUser(loggedInUser),
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: null },
    },
    { new: true },
  );

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token", [error.message]);
  }

  const user = await User.findById(decodedToken?._id).select("+refreshToken");

  if (!user) {
    throw new ApiError(401, "Refresh token does not belong to a valid user");
  }

  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed successfully",
      ),
    );
});

const verifySession = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: sanitizeUser(req.user) }, "Session valid"));
});

export {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  verifySession,
};