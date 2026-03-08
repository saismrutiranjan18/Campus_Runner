import mongoose from "mongoose";

const allowedReportEntityTypes = ["user", "task"];
const allowedReportStatuses = ["open", "reviewed", "resolved", "dismissed"];

const reportSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: allowedReportEntityTypes,
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reportedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
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
    status: {
      type: String,
      enum: allowedReportStatuses,
      default: "open",
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

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ entityType: 1, status: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

export { Report, allowedReportEntityTypes, allowedReportStatuses };