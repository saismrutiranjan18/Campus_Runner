import jwt from "jsonwebtoken";

import { Session } from "../models/session.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, _, next) => {
  const authHeader = req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  const token = req.cookies?.accessToken || bearerToken;

  if (!token) {
    throw new ApiError(401, "Unauthorized request: access token missing");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token", [error.message]);
  }

  const user = await User.findById(decodedToken?._id);
  if (!user) {
    throw new ApiError(401, "User not found for this token");
  }

  if (decodedToken?.sid) {
    const session = await Session.findOne({
      _id: decodedToken.sid,
      user: user._id,
      revokedAt: null,
    });

    if (!session) {
      throw new ApiError(401, "Session has been revoked or no longer exists");
    }

    req.authSession = session;
    req.authSessionId = String(session._id);
  }

  if (!user.isActive) {
    throw new ApiError(403, "User account is inactive");
  }

  req.user = user;
  next();
});

const authorizeRoles = (...roles) => {
  return (req, _, next) => {
    if (!req.user) {
      next(new ApiError(401, "Unauthorized request"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new ApiError(
          403,
          `Access denied. Required role: ${roles.join(", ")}. Current role: ${req.user.role}`,
        ),
      );
      return;
    }

    next();
  };
};

export { authorizeRoles, verifyJWT };