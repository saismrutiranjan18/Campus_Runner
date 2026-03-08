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
import { sanitizeUser as sanitizeProfileUser } from "./profile.controller.js";
import { allowedCooldownActions } from "../models/user.model.js";
import { validateCampusScopesInput } from "../utils/campusScope.js";
import {
  buildRunnerMetricsMap,
  buildRunnerPerformanceEntry,
} from "../services/runnerPerformance.service.js";
import { applyUserCooldown, isCooldownActive } from "../services/cooldown.service.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DEFAULT_ANALYTICS_DAYS = 7;
const MAX_ANALYTICS_DAYS = 90;

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

const sanitizeCooldown = (cooldown) => ({
  id: cooldown._id,
  action: cooldown.action,
  reason: cooldown.reason,
  sourceType: cooldown.sourceType,
  startsAt: cooldown.startsAt,
  endsAt: cooldown.endsAt,
  isActive: isCooldownActive(cooldown),
  triggeredBy:
    cooldown.triggeredBy && cooldown.triggeredBy._id
      ? sanitizeUser(cooldown.triggeredBy)
      : cooldown.triggeredBy || null,
  clearedAt: cooldown.clearedAt,
  clearedBy:
    cooldown.clearedBy && cooldown.clearedBy._id
      ? sanitizeUser(cooldown.clearedBy)
      : cooldown.clearedBy || null,
  clearReason: cooldown.clearReason,
  metadata: cooldown.metadata || {},
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

const roundToTwoDecimals = (value) => {
  return Math.round(value * 100) / 100;
};

const resolveAnalyticsWindow = (daysInput, now = new Date()) => {
  const parsedDays = Number(daysInput ?? DEFAULT_ANALYTICS_DAYS);

  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_ANALYTICS_DAYS) {
    throw new ApiError(400, `days must be an integer between 1 and ${MAX_ANALYTICS_DAYS}`);
  }

  const windowEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const windowStart = new Date(windowEnd);
  windowStart.setUTCDate(windowStart.getUTCDate() - parsedDays);

  const labels = [];
  const cursor = new Date(windowStart);
  while (cursor < windowEnd) {
    labels.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    days: parsedDays,
    start: windowStart,
    end: windowEnd,
    labels,
  };
};

const mapTrendByDate = (labels, rows, valueField) => {
  const valueByDate = new Map(rows.map((row) => [row._id, row[valueField]]));

  return labels.map((date) => ({
    date,
    value: valueByDate.get(date) || 0,
  }));
};

const getAdminAnalyticsDashboard = asyncHandler(async (req, res) => {
  const analyticsWindow = resolveAnalyticsWindow(req.query.days);

  const [
    totalTasks,
    openTasks,
    completedTasks,
    cancelledTasks,
    archivedTasks,
    activeRunners,
    activeUsers,
    openReports,
    payoutTotals,
    tasksCreatedTrendRows,
    tasksCompletedTrendRows,
    tasksCancelledTrendRows,
    payoutTrendRows,
    topCampuses,
  ] = await Promise.all([
    Task.countDocuments({}),
    Task.countDocuments({ status: "open", isArchived: false }),
    Task.countDocuments({ status: "completed" }),
    Task.countDocuments({ status: "cancelled" }),
    Task.countDocuments({ isArchived: true }),
    User.countDocuments({ role: "runner", isActive: true }),
    User.countDocuments({ isActive: true }),
    Report.countDocuments({ status: "open" }),
    WalletTransaction.aggregate([
      {
        $match: {
          type: "credit",
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalWalletPayouts: { $sum: "$amount" },
          payoutCount: { $sum: 1 },
        },
      },
    ]),
    Task.aggregate([
      {
        $match: {
          createdAt: { $gte: analyticsWindow.start, $lt: analyticsWindow.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.aggregate([
      {
        $match: {
          completedAt: { $gte: analyticsWindow.start, $lt: analyticsWindow.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completedAt",
              timezone: "UTC",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.aggregate([
      {
        $match: {
          cancelledAt: { $gte: analyticsWindow.start, $lt: analyticsWindow.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$cancelledAt",
              timezone: "UTC",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    WalletTransaction.aggregate([
      {
        $match: {
          type: "credit",
          status: "completed",
          createdAt: { $gte: analyticsWindow.start, $lt: analyticsWindow.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.aggregate([
      {
        $match: {
          campus: { $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$campus",
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          cancelledCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
          openCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "open"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { taskCount: -1, _id: 1 } },
      { $limit: 5 },
    ]),
  ]);

  const payoutSummary = payoutTotals[0] || {
    totalWalletPayouts: 0,
    payoutCount: 0,
  };

  const cancellationRate =
    totalTasks === 0 ? 0 : roundToTwoDecimals((cancelledTasks / totalTasks) * 100);
  const completionRate =
    totalTasks === 0 ? 0 : roundToTwoDecimals((completedTasks / totalTasks) * 100);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        window: {
          days: analyticsWindow.days,
          startDate: analyticsWindow.start.toISOString(),
          endDateExclusive: analyticsWindow.end.toISOString(),
        },
        overview: {
          totalTasks,
          openTasks,
          completedTasks,
          cancelledTasks,
          archivedTasks,
          activeRunners,
          activeUsers,
          openReports,
          totalWalletPayouts: payoutSummary.totalWalletPayouts,
          payoutCount: payoutSummary.payoutCount,
        },
        rates: {
          cancellationRate,
          completionRate,
        },
        trends: {
          tasksCreated: mapTrendByDate(analyticsWindow.labels, tasksCreatedTrendRows, "count"),
          tasksCompleted: mapTrendByDate(
            analyticsWindow.labels,
            tasksCompletedTrendRows,
            "count",
          ),
          tasksCancelled: mapTrendByDate(
            analyticsWindow.labels,
            tasksCancelledTrendRows,
            "count",
          ),
          walletPayouts: mapTrendByDate(
            analyticsWindow.labels,
            payoutTrendRows,
            "totalAmount",
          ),
        },
        topCampuses: topCampuses.map((campus) => ({
          campus: campus._id,
          taskCount: campus.taskCount,
          openCount: campus.openCount,
          completedCount: campus.completedCount,
          cancelledCount: campus.cancelledCount,
        })),
      },
      "Admin analytics dashboard fetched successfully",
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

const getUserCampusScopes = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  ensureValidObjectId(userId, "user id");

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeProfileUser(user),
        campusScopes: user.campusScopes || [],
      },
      "User campus scopes fetched successfully",
    ),
  );
});

const updateUserCampusScopes = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { campusScopes } = req.body;

  ensureValidObjectId(userId, "user id");

  const sanitizedScopes = validateCampusScopesInput(campusScopes);
  const user = await User.findByIdAndUpdate(
    userId,
    {
      campusScopes: sanitizedScopes,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeProfileUser(user),
        campusScopes: user.campusScopes || [],
      },
      "User campus scopes updated successfully",
    ),
  );
});

const listUserCooldowns = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  ensureValidObjectId(userId, "user id");

  const user = await User.findById(userId).populate([
    {
      path: "cooldowns.triggeredBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
    {
      path: "cooldowns.clearedBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const cooldowns = [...(user.cooldowns || [])].sort((left, right) => right.startsAt - left.startsAt);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeProfileUser(user),
        activeCooldowns: cooldowns.filter((cooldown) => isCooldownActive(cooldown)).map(sanitizeCooldown),
        cooldownHistory: cooldowns.map(sanitizeCooldown),
      },
      "User cooldowns fetched successfully",
    ),
  );
});

const createUserCooldown = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { action, reason, durationHours } = req.body;

  ensureValidObjectId(userId, "user id");

  if (!allowedCooldownActions.includes(action)) {
    throw new ApiError(400, "Invalid cooldown action provided");
  }

  const parsedDurationHours = Number(durationHours);
  if (!Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0 || parsedDurationHours > 168) {
    throw new ApiError(400, "durationHours must be a number between 1 and 168");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const cooldown = await applyUserCooldown({
    userId,
    action,
    durationHours: parsedDurationHours,
    reason: reason?.trim() || "Manual admin cooldown applied",
    sourceType: "admin",
    triggeredBy: req.user._id,
    metadata: {
      manual: true,
    },
  });

  await user.populate([
    {
      path: "cooldowns.triggeredBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
    {
      path: "cooldowns.clearedBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
  ]);

  const savedCooldown = user.cooldowns.id(cooldown._id);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: sanitizeProfileUser(user),
        cooldown: sanitizeCooldown(savedCooldown),
      },
      "User cooldown created successfully",
    ),
  );
});

const clearUserCooldown = asyncHandler(async (req, res) => {
  const { userId, cooldownId } = req.params;
  const { clearReason } = req.body;

  ensureValidObjectId(userId, "user id");
  ensureValidObjectId(cooldownId, "cooldown id");

  const user = await User.findById(userId).populate([
    {
      path: "cooldowns.triggeredBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
    {
      path: "cooldowns.clearedBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const cooldown = user.cooldowns.id(cooldownId);
  if (!cooldown) {
    throw new ApiError(404, "Cooldown not found");
  }

  cooldown.clearedAt = new Date();
  cooldown.clearedBy = req.user._id;
  cooldown.clearReason = clearReason?.trim() || "Cooldown cleared by admin";

  await user.save({ validateBeforeSave: false });
  await user.populate([
    {
      path: "cooldowns.triggeredBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
    {
      path: "cooldowns.clearedBy",
      select: "fullName email phoneNumber role isVerified isActive",
    },
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeProfileUser(user),
        cooldown: sanitizeCooldown(user.cooldowns.id(cooldownId)),
      },
      "User cooldown cleared successfully",
    ),
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
  clearUserCooldown,
  createUserCooldown,
  getAdminAnalyticsDashboard,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  getUserCampusScopes,
  listFraudFlags,
  listReportedIssues,
  listUserCooldowns,
  suspendUser,
  updateReportStatus,
  updateFraudFlagStatus,
  updateUserCampusScopes,
};