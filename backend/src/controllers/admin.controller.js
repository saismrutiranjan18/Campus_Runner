import mongoose from "mongoose";

import {
  FraudFlag,
  allowedFraudFlagSeverities,
  allowedFraudFlagStatuses,
  allowedFraudFlagTypes,
} from "../models/fraudFlag.model.js";
import { Report, allowedReportEntityTypes, allowedReportStatuses } from "../models/report.model.js";
import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const reportPopulateFields = [
  {
    path: "reporter",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "reportedUser",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "reviewedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "reportedTask",
    populate: [
      {
        path: "requestedBy",
        select: "fullName email phoneNumber role isVerified isActive",
      },
      {
        path: "assignedRunner",
        select: "fullName email phoneNumber role isVerified isActive",
      },
      {
        path: "archivedBy",
        select: "fullName email phoneNumber role isVerified isActive",
      },
    ],
  },
];

const fraudFlagPopulateFields = [
  {
    path: "user",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "secondaryUser",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "task",
    populate: [
      {
        path: "requestedBy",
        select: "fullName email phoneNumber role isVerified isActive",
      },
      {
        path: "assignedRunner",
        select: "fullName email phoneNumber role isVerified isActive",
      },
    ],
  },
  {
    path: "walletTransaction",
    populate: [
      {
        path: "user",
        select: "fullName email phoneNumber role isVerified isActive",
      },
      {
        path: "initiatedBy",
        select: "fullName email phoneNumber role isVerified isActive",
      },
    ],
  },
  {
    path: "reviewedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
];

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    suspendedAt: user.suspendedAt,
    suspensionReason: user.suspensionReason,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const sanitizeTaskUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
  };
};

const sanitizeTask = (task) => {
  if (!task) {
    return null;
  }

  return {
    id: task._id,
    title: task.title,
    description: task.description,
    pickupLocation: task.pickupLocation,
    dropoffLocation: task.dropoffLocation,
    reward: task.reward,
    status: task.status,
    isArchived: task.isArchived,
    archivedAt: task.archivedAt,
    archiveReason: task.archiveReason,
    requestedBy: sanitizeTaskUser(task.requestedBy),
    assignedRunner: sanitizeTaskUser(task.assignedRunner),
    archivedBy: sanitizeTaskUser(task.archivedBy),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

const sanitizeReport = (report) => ({
  id: report._id,
  entityType: report.entityType,
  reporter: sanitizeUser(report.reporter),
  reportedUser: sanitizeUser(report.reportedUser),
  reportedTask: sanitizeTask(report.reportedTask),
  reason: report.reason,
  details: report.details,
  status: report.status,
  reviewedBy: sanitizeUser(report.reviewedBy),
  reviewedAt: report.reviewedAt,
  resolutionNote: report.resolutionNote,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
});

const sanitizeFraudFlag = (flag) => ({
  id: flag._id,
  flagType: flag.flagType,
  severity: flag.severity,
  status: flag.status,
  title: flag.title,
  reason: flag.reason,
  occurrenceCount: flag.occurrenceCount,
  metrics: flag.metrics,
  lastDetectedAt: flag.lastDetectedAt,
  user: sanitizeUser(flag.user),
  secondaryUser: sanitizeUser(flag.secondaryUser),
  task: sanitizeTask(flag.task),
  walletTransaction: flag.walletTransaction
    ? {
        id: flag.walletTransaction._id,
        user: sanitizeUser(flag.walletTransaction.user),
        type: flag.walletTransaction.type,
        amount: flag.walletTransaction.amount,
        status: flag.walletTransaction.status,
        description: flag.walletTransaction.description,
        reference: flag.walletTransaction.reference,
        failureReason: flag.walletTransaction.failureReason,
        initiatedBy: sanitizeUser(flag.walletTransaction.initiatedBy),
        createdAt: flag.walletTransaction.createdAt,
        updatedAt: flag.walletTransaction.updatedAt,
      }
    : null,
  reviewedBy: sanitizeUser(flag.reviewedBy),
  reviewedAt: flag.reviewedAt,
  resolutionNote: flag.resolutionNote,
  createdAt: flag.createdAt,
  updatedAt: flag.updatedAt,
});

const ensureValidObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName} provided`);
  }
};

const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { suspensionReason } = req.body;

  ensureValidObjectId(userId, "user id");

  if (String(req.user._id) === userId) {
    throw new ApiError(400, "Admins cannot suspend their own account");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isActive = false;
  user.suspendedAt = new Date();
  user.suspensionReason = suspensionReason?.trim() || "Suspended by admin moderation";
  user.suspendedBy = req.user._id;

  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, sanitizeUser(user), "User suspended successfully"),
  );
});

const archiveTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { archiveReason } = req.body;

  ensureValidObjectId(taskId, "task id");

  const task = await Task.findById(taskId)
    .populate("requestedBy", "fullName email phoneNumber role isVerified isActive")
    .populate("assignedRunner", "fullName email phoneNumber role isVerified isActive")
    .populate("archivedBy", "fullName email phoneNumber role isVerified isActive");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (task.isArchived) {
    throw new ApiError(409, "Task is already archived");
  }

  task.isArchived = true;
  task.archivedAt = new Date();
  task.archiveReason = archiveReason?.trim() || "Archived by admin moderation";
  task.archivedBy = req.user._id;

  if (["open", "accepted", "in_progress"].includes(task.status)) {
    task.status = "cancelled";
    task.cancelledAt = new Date();
    task.cancellationReason = task.archiveReason;
  }

  await task.save();
  await task.populate("archivedBy", "fullName email phoneNumber role isVerified isActive");

  res.status(200).json(
    new ApiResponse(200, sanitizeTask(task), "Task archived successfully"),
  );
});

const listReportedIssues = asyncHandler(async (req, res) => {
  const { status, entityType, page = 1, limit = 20 } = req.query;

  const filters = {};
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (status) {
    if (!allowedReportStatuses.includes(status)) {
      throw new ApiError(400, "Invalid report status filter");
    }

    filters.status = status;
  }

  if (entityType) {
    if (!allowedReportEntityTypes.includes(entityType)) {
      throw new ApiError(400, "Invalid report entity type filter");
    }

    filters.entityType = entityType;
  }

  const [reports, total] = await Promise.all([
    Report.find(filters)
      .populate(reportPopulateFields)
      .sort({ createdAt: -1 })
      .skip((resolvedPage - 1) * resolvedLimit)
      .limit(resolvedLimit),
    Report.countDocuments(filters),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: reports.map(sanitizeReport),
        pagination: {
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit) || 1,
        },
        filters: {
          status: status || "",
          entityType: entityType || "",
        },
      },
      "Reported issues fetched successfully",
    ),
  );
});

const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, resolutionNote } = req.body;

  ensureValidObjectId(reportId, "report id");

  if (!allowedReportStatuses.includes(status)) {
    throw new ApiError(400, "Invalid report status provided");
  }

  const report = await Report.findById(reportId).populate(reportPopulateFields);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  report.status = status;
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  report.resolutionNote = resolutionNote?.trim() || "";

  await report.save();
  await report.populate(reportPopulateFields);

  res.status(200).json(
    new ApiResponse(200, sanitizeReport(report), "Report status updated successfully"),
  );
});

const listFraudFlags = asyncHandler(async (req, res) => {
  const { status, severity, flagType, page = 1, limit = 20 } = req.query;

  const filters = {};
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (status) {
    if (!allowedFraudFlagStatuses.includes(status)) {
      throw new ApiError(400, "Invalid fraud flag status filter");
    }

    filters.status = status;
  }

  if (severity) {
    if (!allowedFraudFlagSeverities.includes(severity)) {
      throw new ApiError(400, "Invalid fraud flag severity filter");
    }

    filters.severity = severity;
  }

  if (flagType) {
    if (!allowedFraudFlagTypes.includes(flagType)) {
      throw new ApiError(400, "Invalid fraud flag type filter");
    }

    filters.flagType = flagType;
  }

  const [flags, total] = await Promise.all([
    FraudFlag.find(filters)
      .populate(fraudFlagPopulateFields)
      .sort({ lastDetectedAt: -1, createdAt: -1 })
      .skip((resolvedPage - 1) * resolvedLimit)
      .limit(resolvedLimit),
    FraudFlag.countDocuments(filters),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: flags.map(sanitizeFraudFlag),
        pagination: {
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit) || 1,
        },
        filters: {
          status: status || "",
          severity: severity || "",
          flagType: flagType || "",
        },
      },
      "Fraud flags fetched successfully",
    ),
  );
});

const updateFraudFlagStatus = asyncHandler(async (req, res) => {
  const { flagId } = req.params;
  const { status, resolutionNote } = req.body;

  ensureValidObjectId(flagId, "fraud flag id");

  if (!allowedFraudFlagStatuses.includes(status)) {
    throw new ApiError(400, "Invalid fraud flag status provided");
  }

  const flag = await FraudFlag.findById(flagId).populate(fraudFlagPopulateFields);
  if (!flag) {
    throw new ApiError(404, "Fraud flag not found");
  }

  flag.status = status;
  flag.reviewedBy = req.user._id;
  flag.reviewedAt = new Date();
  flag.resolutionNote = resolutionNote?.trim() || "";

  await flag.save();
  await flag.populate(fraudFlagPopulateFields);

  res.status(200).json(
    new ApiResponse(200, sanitizeFraudFlag(flag), "Fraud flag status updated successfully"),
  );
});

export {
  archiveTask,
  listFraudFlags,
  listReportedIssues,
  suspendUser,
  updateFraudFlagStatus,
  updateReportStatus,
};