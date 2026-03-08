import mongoose from "mongoose";

const allowedTaskStatuses = [
  "open",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const allowedTransportModes = ["walk", "bike", "car", "public_transport", "other"];
const allowedUrgencyLevels = ["standard", "priority", "express"];
const allowedCampusZones = ["central", "academic", "residential", "perimeter", "remote", "other"];

const pricingSnapshotSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["manual", "dynamic"],
      default: "manual",
    },
    engineVersion: {
      type: String,
      trim: true,
      default: "v1",
    },
    currency: {
      type: String,
      trim: true,
      default: "INR",
    },
    quotedAt: {
      type: Date,
      default: Date.now,
    },
    distanceKm: {
      type: Number,
      min: 0,
      default: 0,
    },
    urgencyLevel: {
      type: String,
      enum: allowedUrgencyLevels,
      default: "standard",
    },
    requestedTimeWindowMinutes: {
      type: Number,
      min: 0,
      default: null,
    },
    campusZone: {
      type: String,
      enum: allowedCampusZones,
      default: "other",
    },
    demandOpenTaskCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    components: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    total: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

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
    transportMode: {
      type: String,
      enum: allowedTransportModes,
      default: "other",
      index: true,
    },
    distanceKm: {
      type: Number,
      min: 0,
      default: 0,
    },
    urgencyLevel: {
      type: String,
      enum: allowedUrgencyLevels,
      default: "standard",
      index: true,
    },
    requestedTimeWindowMinutes: {
      type: Number,
      min: 0,
      default: null,
    },
    campusZone: {
      type: String,
      enum: allowedCampusZones,
      default: "other",
      index: true,
    },
    reward: {
      type: Number,
      min: 0,
      default: 0,
    },
    pricingSnapshot: {
      type: pricingSnapshotSchema,
      default: () => ({}),
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
taskSchema.index({ transportMode: 1, status: 1, createdAt: -1 });
taskSchema.index({ campus: 1, campusZone: 1, status: 1, createdAt: -1 });
taskSchema.index({ requestedBy: 1, createdAt: -1 });
taskSchema.index({ assignedRunner: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export {
  Task,
  allowedCampusZones,
  allowedTaskStatuses,
  allowedTransportModes,
  allowedUrgencyLevels,
};