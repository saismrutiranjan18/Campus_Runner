import mongoose from "mongoose";

const allowedFraudFlagTypes = [
  "repeated_cancellations",
  "wallet_abuse",
  "self_dealing_pattern",
  "unusually_fast_completion",
];

const allowedFraudFlagStatuses = ["open", "reviewed", "resolved", "dismissed"];
const allowedFraudFlagSeverities = ["low", "medium", "high"];

const fraudFlagSchema = new mongoose.Schema(
  {
    fingerprint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    flagType: {
      type: String,
      enum: allowedFraudFlagTypes,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: allowedFraudFlagSeverities,
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: allowedFraudFlagStatuses,
      default: "open",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    occurrenceCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    secondaryUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

fraudFlagSchema.index({ fingerprint: 1, status: 1 });
fraudFlagSchema.index({ status: 1, severity: 1, lastDetectedAt: -1 });

const FraudFlag = mongoose.model("FraudFlag", fraudFlagSchema);

export {
  FraudFlag,
  allowedFraudFlagSeverities,
  allowedFraudFlagStatuses,
  allowedFraudFlagTypes,
};