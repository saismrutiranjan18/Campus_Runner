import crypto from "crypto";

import { IdempotencyRequest } from "../models/idempotencyRequest.model.js";
import { ApiError } from "../utils/ApiError.js";

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;
const DEFAULT_TTL_HOURS = 24;
const IN_PROGRESS_STALE_MS = 5 * 60 * 1000;

const normalizeFingerprintValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeFingerprintValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((normalized, key) => {
        const normalizedValue = normalizeFingerprintValue(value[key]);

        if (normalizedValue !== undefined) {
          normalized[key] = normalizedValue;
        }

        return normalized;
      }, {});
  }

  return value;
};

const buildRequestFingerprint = (req) => {
  const payload = {
    method: req.method,
    resourcePath: req.originalUrl.split("?")[0],
    params: normalizeFingerprintValue(req.params || {}),
    query: normalizeFingerprintValue(req.query || {}),
    body: normalizeFingerprintValue(req.body || {}),
  };

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const buildExpiryDate = (ttlHours = DEFAULT_TTL_HOURS) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  return expiresAt;
};

const isStaleInProgressRecord = (record) => {
  if (record.status !== "in_progress") {
    return false;
  }

  return Date.now() - new Date(record.updatedAt).getTime() > IN_PROGRESS_STALE_MS;
};

const finalizeIdempotencyRequest = async ({ recordId, statusCode, responseBody, ttlHours }) => {
  if (statusCode >= 200 && statusCode < 300 && responseBody !== undefined) {
    await IdempotencyRequest.updateOne(
      {
        _id: recordId,
        status: "in_progress",
      },
      {
        $set: {
          status: "completed",
          responseStatusCode: statusCode,
          responseBody,
          completedAt: new Date(),
          expiresAt: buildExpiryDate(ttlHours),
        },
      },
    );

    return;
  }

  await IdempotencyRequest.deleteOne({
    _id: recordId,
    status: "in_progress",
  });
};

const createIdempotencyMiddleware = ({ ttlHours = DEFAULT_TTL_HOURS } = {}) => {
  return async (req, res, next) => {
    const rawKey = req.get("Idempotency-Key");

    if (rawKey === undefined) {
      next();
      return;
    }

    const key = String(rawKey).trim();
    if (!key) {
      next(new ApiError(400, "Idempotency-Key header cannot be empty"));
      return;
    }

    if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      next(
        new ApiError(
          400,
          `Idempotency-Key header must not exceed ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
        ),
      );
      return;
    }

    if (!req.user?._id) {
      next(new ApiError(500, "Idempotency middleware requires an authenticated user"));
      return;
    }

    const scope = {
      actor: req.user._id,
      method: req.method,
      resourcePath: req.originalUrl.split("?")[0],
      key,
    };
    const requestFingerprint = buildRequestFingerprint(req);

    const replayExistingRequest = async (record) => {
      if (!record) {
        return false;
      }

      if (record.requestFingerprint !== requestFingerprint) {
        throw new ApiError(
          409,
          "This Idempotency-Key has already been used with a different request payload",
        );
      }

      if (isStaleInProgressRecord(record)) {
        await IdempotencyRequest.deleteOne({
          _id: record._id,
          status: "in_progress",
        });

        return false;
      }

      if (record.status === "completed") {
        res.set("Idempotency-Key", key);
        res.set("Idempotency-Status", "replayed");
        res.set("Idempotency-Replayed", "true");
        res.status(record.responseStatusCode).json(record.responseBody);

        return true;
      }

      throw new ApiError(409, "A request with this Idempotency-Key is already in progress");
    };

    try {
      const existingRecord = await IdempotencyRequest.findOne(scope);
      if (await replayExistingRequest(existingRecord)) {
        return;
      }

      const record = await IdempotencyRequest.create({
        ...scope,
        requestFingerprint,
        status: "in_progress",
        expiresAt: buildExpiryDate(ttlHours),
      });

      const originalJson = res.json.bind(res);
      res.locals.idempotencyRecordId = record._id;
      res.locals.idempotencyResponseBody = undefined;

      res.set("Idempotency-Key", key);
      res.set("Idempotency-Status", "created");

      res.json = (body) => {
        res.locals.idempotencyResponseBody = body;

        return originalJson(body);
      };

      res.once("finish", () => {
        void finalizeIdempotencyRequest({
          recordId: record._id,
          statusCode: res.statusCode,
          responseBody: res.locals.idempotencyResponseBody,
          ttlHours,
        }).catch(() => {});
      });

      next();
    } catch (error) {
      if (error?.code === 11000) {
        try {
          const duplicateRecord = await IdempotencyRequest.findOne(scope);
          if (await replayExistingRequest(duplicateRecord)) {
            return;
          }

          next(new ApiError(409, "A request with this Idempotency-Key is already in progress"));
          return;
        } catch (duplicateError) {
          next(duplicateError);
          return;
        }
      }

      next(error);
    }
  };
};

export { createIdempotencyMiddleware };