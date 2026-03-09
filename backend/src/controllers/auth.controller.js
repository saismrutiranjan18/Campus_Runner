import crypto from "crypto";
import jwt from "jsonwebtoken";

import { Session } from "../models/session.model.js";
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

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const extractClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return String(req.ip || req.socket?.remoteAddress || "").trim();
};

const extractUserAgent = (req) => String(req.headers["user-agent"] || "").trim();

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

const sanitizeSession = (session, currentSessionId = "") => ({
  id: session._id,
  ipAddress: session.ipAddress || "",
  userAgent: session.userAgent || "",
  accessTokenIssuedAt: session.accessTokenIssuedAt,
  refreshTokenIssuedAt: session.refreshTokenIssuedAt,
  lastSeenAt: session.lastSeenAt,
  revokedAt: session.revokedAt,
  revokedReason: session.revokedReason,
  isCurrent: currentSessionId ? String(session._id) === String(currentSessionId) : false,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

const createSessionRecord = async (userId, req) => {
  return Session.create({
    user: userId,
    ipAddress: extractClientIp(req),
    userAgent: extractUserAgent(req),
    lastSeenAt: new Date(),
  });
};

const generateAccessAndRefreshTokens = async ({ userId, sessionId, req }) => {
  const user = await User.findById(userId).select("+refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found while generating tokens");
  }

  const session = await Session.findOne({
    _id: sessionId,
    user: user._id,
  });

  if (!session) {
    throw new ApiError(404, "Session not found while generating tokens");
  }

  const accessToken = user.generateAccessToken({ sessionId: String(session._id) });
  const refreshToken = user.generateRefreshToken({ sessionId: String(session._id) });
  const issuedAt = new Date();

  session.refreshTokenHash = hashToken(refreshToken);
  session.accessTokenIssuedAt = issuedAt;
  session.refreshTokenIssuedAt = issuedAt;
  session.lastSeenAt = issuedAt;
  session.ipAddress = extractClientIp(req) || session.ipAddress;
  session.userAgent = extractUserAgent(req) || session.userAgent;

  await session.save({ validateBeforeSave: false });

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken, session };
};

const revokeSession = async ({ session, reason, clearUserRefreshToken = false, userId = null }) => {
  if (!session || session.revokedAt) {
    return session;
  }

  session.revokedAt = new Date();
  session.revokedReason = reason?.trim() || "Session revoked";
  await session.save({ validateBeforeSave: false });

  if (clearUserRefreshToken && userId) {
    await User.findByIdAndUpdate(userId, {
      $set: { refreshToken: null },
    });
  }

  return session;
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

  const session = await createSessionRecord(user._id, req);
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens({
    userId: user._id,
    sessionId: session._id,
    req,
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

  const session = await createSessionRecord(user._id, req);
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens({
    userId: user._id,
    sessionId: session._id,
    req,
  });

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
  if (req.authSession) {
    await revokeSession({
      session: req.authSession,
      reason: "User logged out",
      clearUserRefreshToken: true,
      userId: req.user._id,
    });
  } else {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: { refreshToken: null },
      },
      { new: true },
    );
  }

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

  let session = null;

  if (decodedToken?.sid) {
    session = await Session.findOne({
      _id: decodedToken.sid,
      user: user._id,
      revokedAt: null,
    });

    if (!session) {
      throw new ApiError(401, "Refresh token session is revoked or missing");
    }

    if (session.refreshTokenHash !== hashToken(incomingRefreshToken)) {
      throw new ApiError(401, "Refresh token mismatch");
    }
  } else if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  if (!session) {
    session = await createSessionRecord(user._id, req);
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens({
    userId: user._id,
    sessionId: session._id,
    req,
  });

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

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.user._id })
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .limit(20);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: sessions.map((session) => sanitizeSession(session, req.authSessionId)),
      },
      "Sessions fetched successfully",
    ),
  );
});

const revokeSessionById = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findOne({
    _id: sessionId,
    user: req.user._id,
  });

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  await revokeSession({
    session,
    reason: "Session revoked manually",
    clearUserRefreshToken: Boolean(req.authSessionId && String(session._id) === String(req.authSessionId)),
    userId: req.user._id,
  });

  const shouldClearCookies = req.authSessionId && String(session._id) === String(req.authSessionId);
  const response = new ApiResponse(
    200,
    sanitizeSession(session, req.authSessionId),
    "Session revoked successfully",
  );

  if (shouldClearCookies) {
    res.clearCookie("accessToken", cookieOptions).clearCookie("refreshToken", cookieOptions);
  }

  res.status(200).json(response);
});

export {
  loginUser,
  listSessions,
  logoutUser,
  refreshAccessToken,
  revokeSessionById,
  registerUser,
  verifySession,
};