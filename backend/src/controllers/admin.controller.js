import mongoose from "mongoose";

import { Report, allowedReportEntityTypes, allowedReportStatuses } from "../models/report.model.js";
import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import {
  buildRunnerMetricsMap,
  buildRunnerPerformanceEntry,
} from "../services/runnerPerformance.service.js";
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

const ensureValidObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName} provided`);
  }
};

const sanitizeRunner = (runner) => ({
  id: runner._id,
  fullName: runner.fullName,
  email: runner.email,
  phoneNumber: runner.phoneNumber,
  campusId: runner.campusId,
  campusName: runner.campusName,
  role: runner.role,
  isVerified: runner.isVerified,
  isActive: runner.isActive,
  createdAt: runner.createdAt,
  updatedAt: runner.updatedAt,
});

const normalizePerformanceSortValue = (entry, sortBy) => {
  if (sortBy === "fullName") {
    return entry.runner.fullName.toLowerCase();
  }

  return entry.metrics[sortBy] ?? 0;
};

const sortRunnerPerformanceEntries = (entries, sortBy, order) => {
  return [...entries].sort((left, right) => {
    const leftValue = normalizePerformanceSortValue(left, sortBy);
    const rightValue = normalizePerformanceSortValue(right, sortBy);

    if (leftValue < rightValue) {
      return order === "asc" ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return order === "asc" ? 1 : -1;
    }

    return left.runner.fullName.localeCompare(right.runner.fullName);
  });
};

const getRunnerPerformanceMetrics = asyncHandler(async (req, res) => {
  const {
    search,
    active,
    verified,
    campusId,
    page = 1,
    limit = 20,
    sortBy = "totalEarnings",
    order = "desc",
  } = req.query;

  const runnerFilters = { role: "runner" };
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const allowedSortFields = [
    "fullName",
    "acceptedTaskCount",
    "activeTaskCount",
    "completedTaskCount",
    "cancelledTaskCount",
    "acceptanceRate",
    "completionRate",
    "cancellationRate",
    "averageCompletionTimeMinutes",
    "totalEarnings",
  ];
  const resolvedOrder = String(order).toLowerCase() === "asc" ? "asc" : "desc";

  if (!allowedSortFields.includes(sortBy)) {
    throw new ApiError(400, "Invalid runner performance sort field");
  }

  if (active !== undefined) {
    runnerFilters.isActive = active === "true";
  }

  if (verified !== undefined) {
    runnerFilters.isVerified = verified === "true";
  }

  if (campusId) {
    runnerFilters.campusId = campusId;
  }

  if (search?.trim()) {
    runnerFilters.$or = [
      { fullName: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
      { phoneNumber: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const runners = await User.find(runnerFilters).sort({ createdAt: -1 });
  const metricsByRunnerId = await buildRunnerMetricsMap(runners.map((runner) => runner._id));
  const entries = runners.map((runner) =>
    buildRunnerPerformanceEntry(runner, metricsByRunnerId.get(String(runner._id))),
  );
  const sortedEntries = sortRunnerPerformanceEntries(entries, sortBy, resolvedOrder);
  const total = sortedEntries.length;
  const paginatedItems = sortedEntries.slice(
    (resolvedPage - 1) * resolvedLimit,
    resolvedPage * resolvedLimit,
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: paginatedItems,
        pagination: {
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit) || 1,
        },
        filters: {
          search: search || "",
          active: active ?? "",
          verified: verified ?? "",
          campusId: campusId || "",
          sortBy,
          order: resolvedOrder,
        },
      },
      "Runner performance metrics fetched successfully",
    ),
  );
});

const getRunnerPerformanceById = asyncHandler(async (req, res) => {
  const { runnerId } = req.params;
  ensureValidObjectId(runnerId, "runner id");

  const runner = await User.findOne({ _id: runnerId, role: "runner" });
  if (!runner) {
    throw new ApiError(404, "Runner not found");
  }

  const metricsByRunnerId = await buildRunnerMetricsMap([runner._id]);
  const runnerPerformance = buildRunnerPerformanceEntry(
    runner,
    metricsByRunnerId.get(String(runner._id)),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        runner: sanitizeRunner(runner),
        metrics: runnerPerformance.metrics,
      },
      "Runner performance metrics fetched successfully",
    ),
  );
});

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

export {
  archiveTask,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  listReportedIssues,
  suspendUser,
  updateReportStatus,
};