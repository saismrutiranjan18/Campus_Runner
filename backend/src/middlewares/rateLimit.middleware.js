import { RateLimitBucket } from "../models/rateLimitBucket.model.js";
import { ApiError } from "../utils/ApiError.js";

const MINUTE_MS = 60 * 1000;

const rateLimitPolicies = {
  authRegister: {
    scope: "auth:register",
    maxRequests: 5,
    windowMs: 15 * MINUTE_MS,
    message: "Too many registration attempts. Please try again later.",
  },
  authLogin: {
    scope: "auth:login",
    maxRequests: 10,
    windowMs: 15 * MINUTE_MS,
    message: "Too many login attempts. Please try again later.",
  },
  authRefresh: {
    scope: "auth:refresh-token",
    maxRequests: 10,
    windowMs: 15 * MINUTE_MS,
    message: "Too many refresh token attempts. Please try again later.",
  },
  authLogout: {
    scope: "auth:logout",
    maxRequests: 20,
    windowMs: 15 * MINUTE_MS,
    message: "Too many logout attempts. Please try again later.",
  },
  taskCreate: {
    scope: "tasks:create",
    maxRequests: 5,
    windowMs: 10 * MINUTE_MS,
    message: "Task creation limit exceeded. Please wait before creating another task.",
  },
  taskCancel: {
    scope: "tasks:cancel",
    maxRequests: 5,
    windowMs: 10 * MINUTE_MS,
    message: "Task cancellation limit exceeded. Please wait before cancelling more tasks.",
  },
  walletChange: {
    scope: "wallet:changes",
    maxRequests: 10,
    windowMs: 15 * MINUTE_MS,
    message: "Wallet change limit exceeded. Please try again later.",
  },
  adminSensitive: {
    scope: "admin:sensitive-mutations",
    maxRequests: 10,
    windowMs: 15 * MINUTE_MS,
    message: "Admin action rate limit exceeded. Please try again later.",
  },
};

const resolveClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
};

const defaultKeyGenerator = (req) => {
  if (req.user?._id) {
    return `user:${req.user._id}`;
  }

  return `ip:${resolveClientIp(req)}`;
};

const getWindowStart = (now, windowMs) => {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
};

const setRateLimitHeaders = ({ res, maxRequests, remaining, windowEndsAt }) => {
  res.set("X-RateLimit-Limit", String(maxRequests));
  res.set("X-RateLimit-Remaining", String(Math.max(remaining, 0)));
  res.set("X-RateLimit-Reset", windowEndsAt.toISOString());
};

const upsertRateLimitBucket = async ({ scope, subjectKey, windowStart, windowEndsAt }) => {
  const filter = {
    scope,
    subjectKey,
    windowStart,
  };
  const update = {
    $inc: {
      count: 1,
    },
    $setOnInsert: {
      windowEndsAt,
      expiresAt: new Date(windowEndsAt.getTime() + (windowEndsAt.getTime() - windowStart.getTime())),
    },
  };

  try {
    return await RateLimitBucket.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: "after",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return RateLimitBucket.findOneAndUpdate(filter, { $inc: { count: 1 } }, {
        returnDocument: "after",
      });
    }

    throw error;
  }
};

const createRateLimitMiddleware = ({
  scope,
  maxRequests,
  windowMs,
  message,
  keyGenerator = defaultKeyGenerator,
}) => {
  return async (req, res, next) => {
    try {
      const subjectKey = keyGenerator(req);
      const now = new Date();
      const windowStart = getWindowStart(now, windowMs);
      const windowEndsAt = new Date(windowStart.getTime() + windowMs);
      const bucket = await upsertRateLimitBucket({
        scope,
        subjectKey,
        windowStart,
        windowEndsAt,
      });

      const remaining = maxRequests - bucket.count;
      setRateLimitHeaders({
        res,
        maxRequests,
        remaining,
        windowEndsAt,
      });

      if (bucket.count > maxRequests) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((windowEndsAt.getTime() - now.getTime()) / 1000),
        );

        res.set("Retry-After", String(retryAfterSeconds));
        next(new ApiError(429, message || "Too many requests. Please try again later."));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export { createRateLimitMiddleware, rateLimitPolicies };