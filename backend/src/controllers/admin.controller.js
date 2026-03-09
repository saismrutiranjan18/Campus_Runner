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
import { applyTaskRefund, allowedRefundTriggerTypes } from "../services/refundLedger.service.js";
import { sanitizeUser as sanitizeProfileUser } from "./profile.controller.js";
import { validateCampusScopesInput } from "../utils/campusScope.js";
import {
  buildRunnerMetricsMap,
  buildRunnerPerformanceEntry,
} from "../services/runnerPerformance.service.js";
import {
  allowedRunnerIncentiveRuleTypes,
  RunnerIncentiveRule,
} from "../models/runnerIncentiveRule.model.js";
import { evaluateRunnerIncentives, normalizeCampusZones } from "../services/runnerIncentive.service.js";
  buildRequesterMetricsMap,
  buildRequesterReputationEntry,
} from "../services/requesterReputation.service.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { sanitizeAttachmentMetadata } from "../utils/attachmentMetadata.js";
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
    path: "attachments.uploadedBy",
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
    restoredAt: user.restoredAt,
    restoreReason: user.restoreReason,
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
    refundStatus: task.refundStatus,
    refundedAmount: task.refundedAmount,
    refundTransactionIds: task.refundTransactions || [],
    campusZone: task.campusZone,
    status: task.status,
    isArchived: task.isArchived,
    archivedAt: task.archivedAt,
    archiveReason: task.archiveReason,
    archivedStatusSnapshot: task.archivedStatusSnapshot,
    restoredAt: task.restoredAt,
    restoreReason: task.restoreReason,
    requestedBy: sanitizeTaskUser(task.requestedBy),
    assignedRunner: sanitizeTaskUser(task.assignedRunner),
    archivedBy: sanitizeTaskUser(task.archivedBy),
    attachments: (task.attachments || []).map((attachment) =>
      sanitizeAttachmentMetadata(attachment, sanitizeTaskUser),
    ),
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
  attachments: (report.attachments || []).map((attachment) =>
    sanitizeAttachmentMetadata(attachment, sanitizeUser),
  ),
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

const sanitizeRunnerIncentiveRule = (rule) => ({
  id: rule._id,
  code: rule.code,
  name: rule.name,
  description: rule.description,
  type: rule.type,
  rewardAmount: rule.rewardAmount,
  minimumCompletedTasks: rule.minimumCompletedTasks,
  minimumCompletionRate: rule.minimumCompletionRate,
  campusZones: rule.campusZones || [],
  isActive: rule.isActive,
  createdBy: rule.createdBy?.fullName ? sanitizeUser(rule.createdBy) : null,
  updatedBy: rule.updatedBy?.fullName ? sanitizeUser(rule.updatedBy) : null,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const sanitizeRunnerIncentivePayout = (item) => ({
  runnerId: item.runnerId,
  rewardAmount: item.rewardAmount,
  status: item.status,
  reference: item.reference,
  rule: sanitizeRunnerIncentiveRule(item.rule),
  evaluationSnapshot: item.evaluationSnapshot,
  transaction: item.transaction
    ? {
        id: item.transaction._id,
        user: sanitizeUser(item.transaction.user),
        amount: item.transaction.amount,
        status: item.transaction.status,
        category: item.transaction.category,
        reference: item.transaction.reference,
        incentiveWindowStart: item.transaction.incentiveWindowStart,
        incentiveWindowEnd: item.transaction.incentiveWindowEnd,
        incentiveMetrics: item.transaction.incentiveMetrics,
        createdAt: item.transaction.createdAt,
      }
    : null,
});

const parseRunnerIncentiveBoolean = (value, fieldName) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new ApiError(400, `${fieldName} must be a boolean`);
};

const normalizeRunnerIncentiveRulePayload = (payload, { partial = false } = {}) => {
  const normalizedPayload = {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(payload, key);

  if (!partial || hasOwn("code")) {
    const code = String(payload.code || "").trim().toUpperCase();
    if (!code) {
      throw new ApiError(400, "code is required");
    }

    normalizedPayload.code = code;
  }

  if (!partial || hasOwn("name")) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new ApiError(400, "name is required");
    }

    normalizedPayload.name = name;
  }

  if (!partial || hasOwn("description")) {
    normalizedPayload.description = String(payload.description || "").trim();
  }

  if (!partial || hasOwn("type")) {
    if (!allowedRunnerIncentiveRuleTypes.includes(payload.type)) {
      throw new ApiError(400, "Invalid runner incentive rule type provided");
    }

    normalizedPayload.type = payload.type;
  }

  if (!partial || hasOwn("rewardAmount")) {
    const rewardAmount = Number(payload.rewardAmount);
    if (Number.isNaN(rewardAmount) || rewardAmount <= 0) {
      throw new ApiError(400, "rewardAmount must be a positive number");
    }

    normalizedPayload.rewardAmount = rewardAmount;
  }

  if (!partial || hasOwn("minimumCompletedTasks")) {
    const minimumCompletedTasks = Number(payload.minimumCompletedTasks ?? 0);
    if (!Number.isInteger(minimumCompletedTasks) || minimumCompletedTasks < 0) {
      throw new ApiError(400, "minimumCompletedTasks must be a non-negative integer");
    }

    normalizedPayload.minimumCompletedTasks = minimumCompletedTasks;
  }

  if (!partial || hasOwn("minimumCompletionRate")) {
    const minimumCompletionRate = Number(payload.minimumCompletionRate ?? 0);
    if (
      Number.isNaN(minimumCompletionRate) ||
      minimumCompletionRate < 0 ||
      minimumCompletionRate > 100
    ) {
      throw new ApiError(400, "minimumCompletionRate must be between 0 and 100");
    }

    normalizedPayload.minimumCompletionRate = minimumCompletionRate;
  }

  if (!partial || hasOwn("campusZones")) {
    if (payload.campusZones !== undefined && !Array.isArray(payload.campusZones)) {
      throw new ApiError(400, "campusZones must be an array of strings");
    }

    normalizedPayload.campusZones = normalizeCampusZones(payload.campusZones || []);
  }

  if (!partial || hasOwn("isActive")) {
    normalizedPayload.isActive = parseRunnerIncentiveBoolean(
      payload.isActive ?? true,
      "isActive",
    );
  }

  const resolvedType = normalizedPayload.type;
  const resolvedMinimumCompletedTasks = normalizedPayload.minimumCompletedTasks;
  const resolvedMinimumCompletionRate = normalizedPayload.minimumCompletionRate;
  const resolvedCampusZones = normalizedPayload.campusZones;

  if (resolvedType === "task_count" && resolvedMinimumCompletedTasks <= 0) {
    throw new ApiError(400, "task_count rules require minimumCompletedTasks greater than 0");
  }

  if (resolvedType === "completion_rate" && resolvedMinimumCompletionRate <= 0) {
    throw new ApiError(
      400,
      "completion_rate rules require minimumCompletionRate greater than 0",
    );
  }

  if (resolvedType === "campus_zone") {
    if (resolvedMinimumCompletedTasks <= 0) {
      throw new ApiError(400, "campus_zone rules require minimumCompletedTasks greater than 0");
    }

    if (!resolvedCampusZones?.length) {
      throw new ApiError(400, "campus_zone rules require at least one campus zone");
    }
  }

  return normalizedPayload;
const normalizeRequesterSortValue = (entry, sortBy) => {
  if (sortBy === "fullName") {
    return entry.requester.fullName.toLowerCase();
  }

  return entry.metrics[sortBy] ?? 0;
};

const sortRequesterReputationEntries = (entries, sortBy, order) => {
  return [...entries].sort((left, right) => {
    const leftValue = normalizeRequesterSortValue(left, sortBy);
    const rightValue = normalizeRequesterSortValue(right, sortBy);

    if (leftValue < rightValue) {
      return order === "asc" ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return order === "asc" ? 1 : -1;
    }

    return left.requester.fullName.localeCompare(right.requester.fullName);
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

const listRunnerIncentiveRules = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.type) {
    if (!allowedRunnerIncentiveRuleTypes.includes(req.query.type)) {
      throw new ApiError(400, "Invalid runner incentive rule type filter");
    }

    filters.type = req.query.type;
  }

  if (req.query.active !== undefined) {
    filters.isActive = parseRunnerIncentiveBoolean(req.query.active, "active");
  }

  const rules = await RunnerIncentiveRule.find(filters)
    .populate("createdBy", "fullName email phoneNumber role isVerified isActive")
    .populate("updatedBy", "fullName email phoneNumber role isVerified isActive")
    .sort({ isActive: -1, createdAt: -1 });
const getRequesterReputationMetrics = asyncHandler(async (req, res) => {
  const {
    search,
    active,
    verified,
    campusId,
    page = 1,
    limit = 20,
    sortBy = "trustScore",
    order = "desc",
  } = req.query;

  const requesterFilters = { role: "requester" };
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const allowedSortFields = [
    "fullName",
    "totalTaskCount",
    "completedTaskCount",
    "cancelledTaskCount",
    "completionRate",
    "cancellationRate",
    "disputeCount",
    "reportCount",
    "moderationIncidentCount",
    "trustScore",
  ];
  const resolvedOrder = String(order).toLowerCase() === "asc" ? "asc" : "desc";

  if (!allowedSortFields.includes(sortBy)) {
    throw new ApiError(400, "Invalid requester reputation sort field");
  }

  if (active !== undefined) {
    requesterFilters.isActive = active === "true";
  }

  if (verified !== undefined) {
    requesterFilters.isVerified = verified === "true";
  }

  if (campusId) {
    requesterFilters.campusId = campusId;
  }

  if (search?.trim()) {
    requesterFilters.$or = [
      { fullName: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
      { phoneNumber: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const requesters = await User.find(requesterFilters).sort({ createdAt: -1 });
  const metricsByRequesterId = await buildRequesterMetricsMap(
    requesters.map((requester) => requester._id),
  );
  const entries = requesters.map((requester) =>
    buildRequesterReputationEntry(
      requester,
      metricsByRequesterId.get(String(requester._id)),
    ),
  );
  const sortedEntries = sortRequesterReputationEntries(entries, sortBy, resolvedOrder);
  const total = sortedEntries.length;
  const paginatedItems = sortedEntries.slice(
    (resolvedPage - 1) * resolvedLimit,
    resolvedPage * resolvedLimit,
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: rules.map(sanitizeRunnerIncentiveRule),
        filters: {
          type: req.query.type || "",
          active: req.query.active ?? "",
        },
      },
      "Runner incentive rules fetched successfully",
    ),
  );
});

const createRunnerIncentiveRule = asyncHandler(async (req, res) => {
  const normalizedPayload = normalizeRunnerIncentiveRulePayload(req.body);

  const existingRule = await RunnerIncentiveRule.findOne({ code: normalizedPayload.code });
  if (existingRule) {
    throw new ApiError(409, "Runner incentive rule code already exists");
  }

  const rule = await RunnerIncentiveRule.create({
    ...normalizedPayload,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await rule.populate("createdBy", "fullName email phoneNumber role isVerified isActive");
  await rule.populate("updatedBy", "fullName email phoneNumber role isVerified isActive");

  res.status(201).json(
    new ApiResponse(
      201,
      sanitizeRunnerIncentiveRule(rule),
      "Runner incentive rule created successfully",
    ),
  );
});

const updateRunnerIncentiveRule = asyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  ensureValidObjectId(ruleId, "runner incentive rule id");

  const existingRule = await RunnerIncentiveRule.findById(ruleId);
  if (!existingRule) {
    throw new ApiError(404, "Runner incentive rule not found");
  }

  const mergedPayload = {
    code: existingRule.code,
    name: existingRule.name,
    description: existingRule.description,
    type: existingRule.type,
    rewardAmount: existingRule.rewardAmount,
    minimumCompletedTasks: existingRule.minimumCompletedTasks,
    minimumCompletionRate: existingRule.minimumCompletionRate,
    campusZones: existingRule.campusZones,
    isActive: existingRule.isActive,
    ...req.body,
  };
  const normalizedPayload = normalizeRunnerIncentiveRulePayload(mergedPayload, {
    partial: true,
  });

  if (
    normalizedPayload.code &&
    normalizedPayload.code !== existingRule.code &&
    (await RunnerIncentiveRule.exists({ code: normalizedPayload.code, _id: { $ne: ruleId } }))
  ) {
    throw new ApiError(409, "Runner incentive rule code already exists");
  }

  Object.assign(existingRule, normalizedPayload, {
    updatedBy: req.user._id,
  });

  await existingRule.save();
  await existingRule.populate("createdBy", "fullName email phoneNumber role isVerified isActive");
  await existingRule.populate("updatedBy", "fullName email phoneNumber role isVerified isActive");

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeRunnerIncentiveRule(existingRule),
      "Runner incentive rule updated successfully",
    ),
  );
});

const evaluateRunnerIncentiveRules = asyncHandler(async (req, res) => {
  const { ruleIds, windowStart, windowEnd, previewOnly = false, referenceDate } = req.body;

  if (ruleIds !== undefined) {
    if (!Array.isArray(ruleIds) || ruleIds.some((ruleId) => !mongoose.isValidObjectId(ruleId))) {
      throw new ApiError(400, "ruleIds must be an array of valid rule ids");
    }
  }

  const evaluationResult = await evaluateRunnerIncentives({
    initiatedBy: req.user._id,
    ruleIds,
    windowStart,
    windowEnd,
    referenceDate,
    previewOnly: parseRunnerIncentiveBoolean(previewOnly, "previewOnly"),
  });
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
      "Requester reputation metrics fetched successfully",
    ),
  );
});

const getRequesterReputationById = asyncHandler(async (req, res) => {
  const { requesterId } = req.params;
  ensureValidObjectId(requesterId, "requester id");

  const requester = await User.findOne({ _id: requesterId, role: "requester" });
  if (!requester) {
    throw new ApiError(404, "Requester not found");
  }

  const metricsByRequesterId = await buildRequesterMetricsMap([requester._id]);
  const requesterReputation = buildRequesterReputationEntry(
    requester,
    metricsByRequesterId.get(String(requester._id)),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        window: {
          start: evaluationResult.window.windowStart,
          end: evaluationResult.window.windowEnd,
        },
        summary: evaluationResult.summary,
        items: evaluationResult.items.map(sanitizeRunnerIncentivePayout),
      },
      "Runner incentive evaluation completed successfully",
      requesterReputation,
      "Requester reputation metrics fetched successfully",
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
  user.restoredAt = null;
  user.restoredBy = null;
  user.restoreReason = "";

  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, sanitizeUser(user), "User suspended successfully"),
  );
});

const restoreUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { restoreReason } = req.body;

  ensureValidObjectId(userId, "user id");

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isActive && !user.suspendedAt) {
    throw new ApiError(409, "User is not suspended");
  }

  user.isActive = true;
  user.suspendedAt = null;
  user.suspensionReason = "";
  user.suspendedBy = null;
  user.restoredAt = new Date();
  user.restoredBy = req.user._id;
  user.restoreReason = restoreReason?.trim() || "Restored by admin recovery";

  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, sanitizeUser(user), "User restored successfully"),
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
  task.archivedStatusSnapshot = task.status;
  task.restoredAt = null;
  task.restoredBy = null;
  task.restoreReason = "";

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

const refundTaskLedger = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { amount, reason, triggerType, disputeId } = req.body;

  ensureValidObjectId(taskId, "task id");

  if (!allowedRefundTriggerTypes.includes(triggerType)) {
    throw new ApiError(400, "Invalid refund triggerType provided");
  }

  if (disputeId) {
    ensureValidObjectId(disputeId, "dispute id");
  }

  const refundResult = await applyTaskRefund({
    taskId,
    amount,
    reason,
    triggerType,
    initiatedBy: req.user._id,
    disputeId,
  });

  const populatedTask = await Task.findById(refundResult.task._id)
    .populate("requestedBy", "fullName email phoneNumber role isVerified isActive")
    .populate("assignedRunner", "fullName email phoneNumber role isVerified isActive")
    .populate("archivedBy", "fullName email phoneNumber role isVerified isActive");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        task: sanitizeTask(populatedTask),
        refundAmount: refundResult.refundAmount,
        requesterRefundTransactionId: refundResult.requesterRefund._id,
        runnerReversalTransactionId: refundResult.runnerReversal?._id || null,
      },
      "Task refund applied successfully",
    ),
const restoreTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { restoreReason } = req.body;

  ensureValidObjectId(taskId, "task id");

  const task = await Task.findById(taskId)
    .populate("requestedBy", "fullName email phoneNumber role isVerified isActive")
    .populate("assignedRunner", "fullName email phoneNumber role isVerified isActive")
    .populate("archivedBy", "fullName email phoneNumber role isVerified isActive");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (!task.isArchived) {
    throw new ApiError(409, "Task is not archived");
  }

  const restoredStatus = task.archivedStatusSnapshot || task.status || "open";

  task.isArchived = false;
  task.archivedAt = null;
  task.archiveReason = "";
  task.archivedBy = null;
  task.status = restoredStatus;
  task.archivedStatusSnapshot = "";
  task.restoredAt = new Date();
  task.restoredBy = req.user._id;
  task.restoreReason = restoreReason?.trim() || "Restored by admin recovery";

  if (restoredStatus !== "cancelled") {
    task.cancelledAt = null;
    task.cancellationReason = "";
  }

  await task.save();
  await task.populate("archivedBy", "fullName email phoneNumber role isVerified isActive");

  res.status(200).json(
    new ApiResponse(200, sanitizeTask(task), "Task restored successfully"),
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
  createRunnerIncentiveRule,
  evaluateRunnerIncentiveRules,
  getAdminAnalyticsDashboard,
  getRequesterReputationById,
  getRequesterReputationMetrics,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  getUserCampusScopes,
  listRunnerIncentiveRules,
  listFraudFlags,
  listReportedIssues,
  refundTaskLedger,
  restoreTask,
  restoreUser,
  suspendUser,
  updateRunnerIncentiveRule,
  updateReportStatus,
  updateFraudFlagStatus,
  updateUserCampusScopes,
};