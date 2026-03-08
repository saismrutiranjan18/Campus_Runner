import mongoose from "mongoose";

const allowedIdempotencyRequestStatuses = ["in_progress", "completed"];

const buildDefaultExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return expiresAt;
};

const idempotencyRequestSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    method: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    resourcePath: {
      type: String,
      required: true,
      trim: true,
    },
    requestFingerprint: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: allowedIdempotencyRequestStatuses,
      default: "in_progress",
      index: true,
    },
    responseStatusCode: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: buildDefaultExpiryDate,
    },
  },
  {
    timestamps: true,
  },
);

idempotencyRequestSchema.index(
  { actor: 1, method: 1, resourcePath: 1, key: 1 },
  { unique: true },
);

idempotencyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyRequest = mongoose.model(
  "IdempotencyRequest",
  idempotencyRequestSchema,
);

export { IdempotencyRequest, allowedIdempotencyRequestStatuses };