import mongoose from "mongoose";

const allowedWalletTransactionTypes = ["credit", "debit"];
const allowedWalletTransactionStatuses = [
  "pending",
  "completed",
  "failed",
  "superseded",
  "voided",
];
const allowedWalletTransactionCategories = ["manual", "withdrawal_request"];
const allowedWalletTransactionStatuses = ["pending", "completed", "failed"];
const allowedWalletTransactionCategories = [
  "manual",
  "withdrawal_request",
  "refund",
  "reversal",
  "promotion_credit",
  "runner_incentive",
  "referral_reward",
];

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: allowedWalletTransactionTypes,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: allowedWalletTransactionStatuses,
      default: "completed",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
      default: "",
    },
    sourceTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    incentiveRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RunnerIncentiveRule",
      default: null,
    },
    incentiveWindowStart: {
      type: Date,
      default: null,
    },
    incentiveWindowEnd: {
      type: Date,
      default: null,
    },
    incentiveMetrics: {
      completedTaskCount: {
        type: Number,
        default: 0,
      },
      cancelledTaskCount: {
        type: Number,
        default: 0,
      },
      totalResolvedTaskCount: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
      },
      highDemandZoneTaskCount: {
        type: Number,
        default: 0,
      },
      campusZones: {
        type: [String],
        default: [],
      },
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: allowedWalletTransactionCategories,
      default: "manual",
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    linkedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    sourceDispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      default: null,
    },
    retrySourceTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
      index: true,
    },
    supersededAt: {
      type: Date,
      default: null,
    },
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    supersededByTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    voidReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ user: 1, status: 1, createdAt: -1 });
walletTransactionSchema.index({ category: 1, status: 1, createdAt: -1 });
walletTransactionSchema.index({ incentiveRule: 1, incentiveWindowStart: -1, createdAt: -1 });
walletTransactionSchema.index(
  { sourceTask: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceTask: { $type: "objectId" },
      type: "credit",
    },
  },
);
walletTransactionSchema.index(
  { user: 1, category: 1, incentiveRule: 1, incentiveWindowStart: 1, incentiveWindowEnd: 1 },
  {
    unique: true,
    partialFilterExpression: {
      category: "runner_incentive",
      incentiveRule: { $type: "objectId" },
      incentiveWindowStart: { $type: "date" },
      incentiveWindowEnd: { $type: "date" },
    },
  },
);

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema,
);

export {
  allowedWalletTransactionCategories,
  WalletTransaction,
  allowedWalletTransactionStatuses,
  allowedWalletTransactionTypes,
};