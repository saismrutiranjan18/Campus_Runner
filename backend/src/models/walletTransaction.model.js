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