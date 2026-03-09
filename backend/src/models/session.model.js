import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },
    accessTokenIssuedAt: {
      type: Date,
      default: null,
    },
    refreshTokenIssuedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ user: 1, createdAt: -1 });
sessionSchema.index({ user: 1, lastSeenAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

export { Session };