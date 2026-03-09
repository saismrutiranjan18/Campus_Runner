import mongoose from "mongoose";

import { attachmentMetadataSchema } from "../utils/attachmentMetadata.js";

const allowedTaskStatuses = [
  "open",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const allowedTransportModes = ["walk", "bike", "car", "public_transport", "other"];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pickupLocation: {
      type: String,
      required: true,
      trim: true,
    },
    dropoffLocation: {
      type: String,
      required: true,
      trim: true,
    },
    campus: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    campusZone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    transportMode: {
      type: String,
      enum: allowedTransportModes,
      default: "other",
      index: true,
    },
    reward: {
      type: Number,
      min: 0,
      default: 0,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedRunner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: allowedTaskStatuses,
      default: "open",
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    assignmentExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    settlementStatus: {
      type: String,
      enum: ["pending", "settled", "not_required"],
      default: "pending",
      index: true,
    },
    settlementAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    settlementReference: {
      type: String,
      trim: true,
      default: "",
    },
    settlementTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["none", "partial", "full"],
      default: "none",
      index: true,
    },
    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundTransactions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WalletTransaction",
        },
      ],
      default: [],
    },
    lastRefundedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    lastExpiredAt: {
      type: Date,
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    expiryReopenCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    expirationReason: {
      type: String,
      trim: true,
      default: "",
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archiveReason: {
      type: String,
      trim: true,
      default: "",
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attachments: {
      type: [attachmentMetadataSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ status: 1, assignmentExpiresAt: 1, isArchived: 1 });
taskSchema.index({ settlementStatus: 1, completedAt: -1 });
taskSchema.index({ isArchived: 1, status: 1, createdAt: -1 });
taskSchema.index({ campus: 1, status: 1, createdAt: -1 });
taskSchema.index({ campusZone: 1, status: 1, createdAt: -1 });
taskSchema.index({ transportMode: 1, status: 1, createdAt: -1 });
taskSchema.index({ requestedBy: 1, createdAt: -1 });
taskSchema.index({ assignedRunner: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export { Task, allowedTaskStatuses, allowedTransportModes };