import mongoose from "mongoose";

const allowedDisputeStatuses = ["open", "under_review", "resolved", "dismissed"];
const allowedDisputeOpenedByRoles = ["requester", "runner"];

const disputeEvidenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
      default: "link",
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const disputeSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    openedByRole: {
      type: String,
      enum: allowedDisputeOpenedByRoles,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    evidence: {
      type: [disputeEvidenceSchema],
      default: [],
    },
    status: {
      type: String,
      enum: allowedDisputeStatuses,
      default: "open",
      index: true,
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: "",
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
  },
  {
    timestamps: true,
  },
);

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ task: 1, status: 1, createdAt: -1 });
disputeSchema.index({ openedBy: 1, createdAt: -1 });
disputeSchema.index({ task: 1, openedBy: 1 }, { unique: true });

const Dispute = mongoose.model("Dispute", disputeSchema);

export { Dispute, allowedDisputeOpenedByRoles, allowedDisputeStatuses };