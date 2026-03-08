import mongoose from "mongoose";

const rateLimitBucketSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      required: true,
      trim: true,
    },
    subjectKey: {
      type: String,
      required: true,
      trim: true,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    windowEndsAt: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

rateLimitBucketSchema.index({ scope: 1, subjectKey: 1, windowStart: 1 }, { unique: true });
rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitBucket = mongoose.model("RateLimitBucket", rateLimitBucketSchema);

export { RateLimitBucket };