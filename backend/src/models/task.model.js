import mongoose from "mongoose";

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
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
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
taskSchema.index({ isArchived: 1, status: 1, createdAt: -1 });
taskSchema.index({ campus: 1, status: 1, createdAt: -1 });
taskSchema.index({ transportMode: 1, status: 1, createdAt: -1 });
taskSchema.index({ requestedBy: 1, createdAt: -1 });
taskSchema.index({ assignedRunner: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export { Task, allowedTaskStatuses, allowedTransportModes };