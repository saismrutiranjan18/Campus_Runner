import mongoose from "mongoose";

import { calculateAssignmentExpiryDate } from "../background/taskExpiry.monitor.js";
import {
  allowedCampusZones,
  allowedTaskStatuses,
  allowedTransportModes,
  Task,
  allowedUrgencyLevels,
} from "../models/task.model.js";
import {
  normalizeAttachmentMetadata,
  sanitizeAttachmentMetadata,
} from "../utils/attachmentMetadata.js";
import { ensureUserHasCampusAccess } from "../utils/campusScope.js";
import { evaluateTaskForFraudFlags } from "../services/fraudDetection.service.js";
import {
  createManualPricingSnapshot,
  generateTaskPricingQuote,
  hasDynamicPricingInput,
} from "../services/taskPricing.service.js";
import { validateTaskPromotion, recordTaskPromotionRedemption } from "../services/promotion.service.js";
import { awardReferralForUserIfEligible } from "../services/referral.service.js";
import { settleRunnerEarningsForTask } from "../services/taskSettlement.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const taskTransitionMap = {
  open: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const baseTaskUserSelection = "fullName email phoneNumber role isVerified isActive";

const populateTaskFields = [
  {
    path: "requestedBy",
    select: baseTaskUserSelection,
  },
  {
    path: "assignedRunner",
    select: baseTaskUserSelection,
  },
  {
    path: "attachments.uploadedBy",
    select: baseTaskUserSelection,
  },
];

const detailedTaskPopulateFields = [
  ...populateTaskFields,
  {
    path: "archivedBy",
    select: baseTaskUserSelection,
  },
];

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

const sanitizeTask = (task) => ({
  id: task._id,
  title: task.title,
  description: task.description,
  pickupLocation: task.pickupLocation,
  dropoffLocation: task.dropoffLocation,
  campus: task.campus,
  campusZone: task.campusZone,
  transportMode: task.transportMode,
  distanceKm: task.distanceKm,
  urgencyLevel: task.urgencyLevel,
  requestedTimeWindowMinutes: task.requestedTimeWindowMinutes,
  campusZone: task.campusZone,
  reward: task.reward,
  pricingSnapshot: task.pricingSnapshot || null,
  promotionSnapshot: task.promotionSnapshot,
  status: task.status,
  requestedBy: sanitizeTaskUser(task.requestedBy),
  assignedRunner: sanitizeTaskUser(task.assignedRunner),
  acceptedAt: task.acceptedAt,
  assignmentExpiresAt: task.assignmentExpiresAt,
  startedAt: task.startedAt,
  completedAt: task.completedAt,
  settlementStatus: task.settlementStatus,
  settlementAmount: task.settlementAmount,
  settlementReference: task.settlementReference,
  settlementTransactionId: task.settlementTransaction?._id || task.settlementTransaction || null,
  settledAt: task.settledAt,
  cancelledAt: task.cancelledAt,
  cancellationReason: task.cancellationReason,
  lastExpiredAt: task.lastExpiredAt,
  reopenedAt: task.reopenedAt,
  expiryReopenCount: task.expiryReopenCount,
  expirationReason: task.expirationReason,
  isArchived: task.isArchived,
  archivedAt: task.archivedAt,
  archiveReason: task.archiveReason,
  archivedBy: sanitizeTaskUser(task.archivedBy),
  attachments: (task.attachments || []).map((attachment) =>
    sanitizeAttachmentMetadata(attachment, sanitizeTaskUser),
  ),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const ensureValidTaskId = (taskId) => {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid task id provided");
  }
};

const ensureTaskNotArchived = (task) => {
  if (task.isArchived) {
    throw new ApiError(409, "Archived tasks cannot be modified through lifecycle routes");
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const encodeCursor = (task) => {
  return Buffer.from(
    JSON.stringify({
      createdAt: task.createdAt.toISOString(),
      id: String(task._id),
    }),
  ).toString("base64url");
};

const decodeCursor = (cursor) => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (!decoded?.createdAt || !decoded?.id) {
      throw new Error("Cursor payload missing fields");
    }

    ensureValidTaskId(decoded.id);

    const createdAt = new Date(decoded.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Cursor date invalid");
    }

    return {
      createdAt,
      id: decoded.id,
    };
  } catch {
    throw new ApiError(400, "Invalid cursor provided");
  }
};

const parseDateFilter = (value, fieldName, boundary) => {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue);
  const parsedDate = isDateOnly
    ? new Date(`${normalizedValue}T00:00:00.000Z`)
    : new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, `Invalid ${fieldName} provided`);
  }

  if (isDateOnly && boundary === "end") {
    parsedDate.setUTCHours(23, 59, 59, 999);
  }

  return parsedDate;
};

const resolveTaskFeedQuery = (query, overrides = {}) => {
  const {
    status,
    campus,
    transportMode,
    search,
    requestedBy,
    assignedRunner,
    archived,
    fromDate,
    toDate,
    page = 1,
    limit = 20,
    sort = "desc",
    cursor,
  } = query;

  const conditions = [];
  const resolvedStatus = overrides.status ?? status;
  const resolvedCampus = overrides.campus ?? campus;
  const resolvedTransportMode = overrides.transportMode ?? transportMode;
  const resolvedRequestedBy = overrides.requestedBy ?? requestedBy;
  const resolvedAssignedRunner = overrides.assignedRunner ?? assignedRunner;
  const resolvedArchived =
    overrides.isArchived ??
    (archived === undefined ? false : String(archived).toLowerCase() === "true");

  conditions.push({ isArchived: resolvedArchived });

  if (resolvedStatus) {
    if (!allowedTaskStatuses.includes(resolvedStatus)) {
      throw new ApiError(400, "Invalid task status filter");
    }

    conditions.push({ status: resolvedStatus });
  }

  if (resolvedCampus?.trim()) {
    conditions.push({ campus: resolvedCampus.trim() });
  }

  if (resolvedTransportMode) {
    if (!allowedTransportModes.includes(resolvedTransportMode)) {
      throw new ApiError(400, "Invalid transport mode filter");
    }

    conditions.push({ transportMode: resolvedTransportMode });
  }

  if (resolvedRequestedBy) {
    ensureValidTaskId(resolvedRequestedBy);
    conditions.push({ requestedBy: resolvedRequestedBy });
  }

  if (resolvedAssignedRunner) {
    ensureValidTaskId(resolvedAssignedRunner);
    conditions.push({ assignedRunner: resolvedAssignedRunner });
  }

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    conditions.push({
      $or: [
        { title: pattern },
        { description: pattern },
        { pickupLocation: pattern },
        { dropoffLocation: pattern },
        { campus: pattern },
        { campusZone: pattern },
      ],
    });
  }

  const resolvedFromDate = parseDateFilter(overrides.fromDate ?? fromDate, "fromDate", "start");
  const resolvedToDate = parseDateFilter(overrides.toDate ?? toDate, "toDate", "end");

  if (resolvedFromDate && resolvedToDate && resolvedFromDate > resolvedToDate) {
    throw new ApiError(400, "fromDate cannot be later than toDate");
  }

  if (resolvedFromDate || resolvedToDate) {
    const createdAtFilter = {};

    if (resolvedFromDate) {
      createdAtFilter.$gte = resolvedFromDate;
    }

    if (resolvedToDate) {
      createdAtFilter.$lte = resolvedToDate;
    }

    conditions.push({ createdAt: createdAtFilter });
  }

  const resolvedSort = String(sort).toLowerCase() === "asc" ? 1 : -1;
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const decodedCursor = cursor ? decodeCursor(cursor) : null;

  if (decodedCursor) {
    conditions.push({
      $or: [
        {
          createdAt:
            resolvedSort === -1
              ? { $lt: decodedCursor.createdAt }
              : { $gt: decodedCursor.createdAt },
        },
        {
          createdAt: decodedCursor.createdAt,
          _id:
            resolvedSort === -1 ? { $lt: decodedCursor.id } : { $gt: decodedCursor.id },
        },
      ],
    });
  }

  let filters = {};
  if (conditions.length === 1) {
    [filters] = conditions;
  } else if (conditions.length > 1) {
    filters = { $and: conditions };
  }

  return {
    filters,
    resolvedSort,
    resolvedPage,
    resolvedLimit,
    usesCursor: Boolean(decodedCursor),
  };
};

const fetchTaskFeed = async (query, overrides = {}) => {
  const { filters, resolvedSort, resolvedPage, resolvedLimit, usesCursor } =
    resolveTaskFeedQuery(query, overrides);

  const sortOrder = { createdAt: resolvedSort, _id: resolvedSort };
  const baseQuery = Task.find(filters)
    .populate(detailedTaskPopulateFields)
    .sort(sortOrder);

  if (usesCursor) {
    const tasks = await baseQuery.limit(resolvedLimit + 1);
    const hasMore = tasks.length > resolvedLimit;
    const items = hasMore ? tasks.slice(0, resolvedLimit) : tasks;

    return {
      items,
      pagination: {
        mode: "cursor",
        limit: resolvedLimit,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
        hasMore,
        sort: resolvedSort === 1 ? "asc" : "desc",
      },
    };
  }

  const [tasks, total] = await Promise.all([
    baseQuery.skip((resolvedPage - 1) * resolvedLimit).limit(resolvedLimit),
    Task.countDocuments(filters),
  ]);

  return {
    items: tasks,
    pagination: {
      mode: "page",
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      totalPages: Math.ceil(total / resolvedLimit) || 1,
      hasMore: resolvedPage * resolvedLimit < total,
      sort: resolvedSort === 1 ? "asc" : "desc",
    },
  };
};

const assertTransitionAllowed = (task, nextStatus) => {
  const allowedNextStatuses = taskTransitionMap[task.status] || [];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new ApiError(
      409,
      `Illegal task transition from ${task.status} to ${nextStatus}`,
    );
  }
};

const fetchTaskOrThrow = async (taskId) => {
  ensureValidTaskId(taskId);

  const task = await Task.findById(taskId).populate(detailedTaskPopulateFields);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return task;
};

const fetchTaskForAssignment = async (taskId) => {
  ensureValidTaskId(taskId);

  const task = await Task.findById(taskId).select(
    "requestedBy assignedRunner status acceptedAt assignmentExpiresAt isArchived campus",
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return task;
};

const ensureAssignedRunner = (task, user) => {
  if (user.role === "admin") {
    return;
  }

  if (!task.assignedRunner || String(task.assignedRunner._id) !== String(user._id)) {
    throw new ApiError(403, "Only the assigned runner can perform this action");
  }
};

const ensureTaskRequesterOrAdmin = (task, user) => {
  if (user.role === "admin") {
    return;
  }

  if (!task.requestedBy || String(task.requestedBy._id) !== String(user._id)) {
    throw new ApiError(403, "Only the requester who created this task can cancel it");
  }
};

const previewTaskQuote = asyncHandler(async (req, res) => {
  const {
    campus,
    distanceKm,
    urgencyLevel,
    requestedTimeWindowMinutes,
    campusZone,
  } = req.body;

  if (!campus) {
    throw new ApiError(400, "campus is required to preview a quote");
  const { campus, reward, promoCode } = req.body;

  if (!campus) {
    throw new ApiError(400, "campus is required");
  }

  const normalizedReward = Number(reward);
  if (Number.isNaN(normalizedReward) || normalizedReward < 0) {
    throw new ApiError(400, "reward must be a non-negative number");
  }

  const normalizedCampus =
    req.user.role === "admin"
      ? String(campus).trim()
      : ensureUserHasCampusAccess(req.user, campus, "preview pricing");

  const quote = await generateTaskPricingQuote({
    campus: normalizedCampus,
    distanceKm,
    urgencyLevel,
    requestedTimeWindowMinutes,
    campusZone,
  });

      ? campus.trim()
      : ensureUserHasCampusAccess(req.user, campus, "preview quote");

  const promotionValidation = await validateTaskPromotion({
    code: promoCode,
    userId: req.user._id,
    campus: normalizedCampus,
    reward: normalizedReward,
  });

  const finalReward = promotionValidation ? promotionValidation.finalReward : normalizedReward;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        campus: normalizedCampus,
        quote,
      },
      "Task quote preview generated successfully",
        subtotal: normalizedReward,
        promotion: promotionValidation
          ? {
              code: promotionValidation.promotion.code,
              discountAmount: promotionValidation.discountAmount,
              finalReward: promotionValidation.finalReward,
              snapshot: promotionValidation.snapshot,
            }
          : null,
        total: finalReward,
      },
      "Task quote preview fetched successfully",
const ensureTaskParticipantOrAdmin = (task, user) => {
  if (user.role === "admin") {
    return;
  }

  const isRequester = task.requestedBy && String(task.requestedBy._id) === String(user._id);
  const isAssignedRunner =
    task.assignedRunner && String(task.assignedRunner._id) === String(user._id);

  if (!isRequester && !isAssignedRunner) {
    throw new ApiError(403, "Only task participants can manage task attachments");
  }
};

const addTaskAttachment = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);
  ensureTaskNotArchived(task);
  ensureTaskParticipantOrAdmin(task, req.user);

  const attachmentMetadata = normalizeAttachmentMetadata(req.body, {
    defaultKind: "attachment",
    allowedKinds: ["attachment", "proof_of_delivery"],
  });

  if (attachmentMetadata.kind === "proof_of_delivery") {
    const isAssignedRunner =
      req.user.role === "admin" ||
      (task.assignedRunner && String(task.assignedRunner._id) === String(req.user._id));

    if (!isAssignedRunner) {
      throw new ApiError(403, "Only the assigned runner or an admin can add proof-of-delivery metadata");
    }

    if (!["in_progress", "completed"].includes(task.status)) {
      throw new ApiError(409, "Proof-of-delivery metadata can be added only for in-progress or completed tasks");
    }
  }

  task.attachments.push({
    ...attachmentMetadata,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  });

  await task.save();
  await task.populate(detailedTaskPopulateFields);

  const createdAttachment = task.attachments[task.attachments.length - 1];

  res.status(201).json(
    new ApiResponse(
      201,
      {
        taskId: task._id,
        attachment: sanitizeAttachmentMetadata(createdAttachment, sanitizeTaskUser),
      },
      "Task attachment metadata added successfully",
    ),
  );
});

const removeTaskAttachment = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);
  ensureTaskNotArchived(task);

  const attachment = task.attachments.id(req.params.attachmentId);
  if (!attachment) {
    throw new ApiError(404, "Task attachment not found");
  }

  const isAdmin = req.user.role === "admin";
  const isUploader = String(attachment.uploadedBy?._id || attachment.uploadedBy) === String(req.user._id);

  if (!isAdmin && !isUploader) {
    throw new ApiError(403, "Only the uploader or an admin can remove this task attachment");
  }

  attachment.deleteOne();

  await task.save();
  await task.populate(detailedTaskPopulateFields);

  res.status(200).json(
    new ApiResponse(
      200,
      { taskId: task._id, attachments: task.attachments.map((item) => sanitizeAttachmentMetadata(item, sanitizeTaskUser)) },
      "Task attachment metadata removed successfully",
    ),
  );
});

const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    pickupLocation,
    dropoffLocation,
    campus,
    campusZone,
    transportMode,
    distanceKm,
    urgencyLevel,
    requestedTimeWindowMinutes,
    campusZone,
    promoCode,
    reward,
  } = req.body;

  if (!title || !description || !pickupLocation || !dropoffLocation || !campus) {
    throw new ApiError(
      400,
      "title, description, pickupLocation, dropoffLocation and campus are required",
    );
  }

  const normalizedReward = reward === undefined ? 0 : Number(reward);
  if (Number.isNaN(normalizedReward) || normalizedReward < 0) {
    throw new ApiError(400, "reward must be a non-negative number");
  }

  if (transportMode && !allowedTransportModes.includes(transportMode)) {
    throw new ApiError(400, "Invalid transport mode provided");
  }

  if (urgencyLevel && !allowedUrgencyLevels.includes(urgencyLevel)) {
    throw new ApiError(400, "Invalid urgencyLevel provided");
  }

  if (campusZone && !allowedCampusZones.includes(campusZone)) {
    throw new ApiError(400, "Invalid campusZone provided");
  }

  const normalizedCampus =
    req.user.role === "admin"
      ? campus.trim()
      : ensureUserHasCampusAccess(req.user, campus, "create");

  const useDynamicPricing = hasDynamicPricingInput({
    distanceKm,
    urgencyLevel,
    requestedTimeWindowMinutes,
    campusZone,
  });

  const pricingSnapshot = useDynamicPricing
    ? await generateTaskPricingQuote({
        campus: normalizedCampus,
        distanceKm,
        urgencyLevel,
        requestedTimeWindowMinutes,
        campusZone,
      })
    : createManualPricingSnapshot({
        reward: normalizedReward,
        transportMode: transportMode || "other",
        distanceKm: distanceKm === undefined ? 0 : Number(distanceKm) || 0,
        urgencyLevel: urgencyLevel || "standard",
        requestedTimeWindowMinutes:
          requestedTimeWindowMinutes === undefined || requestedTimeWindowMinutes === null
            ? null
            : Number(requestedTimeWindowMinutes),
        campusZone: campusZone || "other",
      });

  const finalReward = pricingSnapshot.total;

  const promotionValidation = await validateTaskPromotion({
    code: promoCode,
    userId: req.user._id,
    campus: normalizedCampus,
    reward: normalizedReward,
  });

  const task = await Task.create({
    title: title.trim(),
    description: description.trim(),
    pickupLocation: pickupLocation.trim(),
    dropoffLocation: dropoffLocation.trim(),
    campus: normalizedCampus,
    campusZone: campusZone?.trim() || "",
    transportMode: transportMode || "other",
    distanceKm: pricingSnapshot.distanceKm,
    urgencyLevel: pricingSnapshot.urgencyLevel,
    requestedTimeWindowMinutes: pricingSnapshot.requestedTimeWindowMinutes,
    campusZone: pricingSnapshot.campusZone,
    reward: finalReward,
    pricingSnapshot,
    reward: promotionValidation ? promotionValidation.finalReward : normalizedReward,
    promotionSnapshot: promotionValidation ? promotionValidation.snapshot : null,
    requestedBy: req.user._id,
  });

  if (promotionValidation) {
    await recordTaskPromotionRedemption({
      promotionValidation,
      userId: req.user._id,
      taskId: task._id,
    });
  }

  const createdTask = await Task.findById(task._id).populate(detailedTaskPopulateFields);

  res
    .status(201)
    .json(new ApiResponse(201, sanitizeTask(createdTask), "Task created successfully"));
});

const listOpenTasks = asyncHandler(async (req, res) => {
  const { items, pagination } = await fetchTaskFeed(req.query, {
    status: "open",
    isArchived: false,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: items.map(sanitizeTask),
        pagination,
        filters: {
          search: req.query.search || "",
          campus: req.query.campus || "",
          status: "open",
          transportMode: req.query.transportMode || "",
          archived: false,
        },
      },
      "Open tasks fetched successfully",
    ),
  );
});

const listTasks = asyncHandler(async (req, res) => {
  const { items, pagination } = await fetchTaskFeed(req.query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: items.map(sanitizeTask),
        pagination,
        filters: {
          search: req.query.search || "",
          campus: req.query.campus || "",
          status: req.query.status || "",
          transportMode: req.query.transportMode || "",
          fromDate: req.query.fromDate || "",
          toDate: req.query.toDate || "",
          archived:
            req.query.archived === undefined
              ? false
              : String(req.query.archived).toLowerCase() === "true",
        },
      },
      "Tasks fetched successfully",
    ),
  );
});

const listRequesterTaskHistory = asyncHandler(async (req, res) => {
  const { items, pagination } = await fetchTaskFeed(req.query, {
    requestedBy: req.user._id,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: items.map(sanitizeTask),
        pagination,
        filters: {
          search: req.query.search || "",
          status: req.query.status || "",
          fromDate: req.query.fromDate || "",
          toDate: req.query.toDate || "",
          archived:
            req.query.archived === undefined
              ? false
              : String(req.query.archived).toLowerCase() === "true",
        },
      },
      "Requester task history fetched successfully",
    ),
  );
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task fetched successfully"));
});

const acceptTask = asyncHandler(async (req, res) => {
  const taskId = req.params.taskId;
  const existingTask = await fetchTaskForAssignment(taskId);

  ensureTaskNotArchived(existingTask);

  if (String(existingTask.requestedBy) === String(req.user._id)) {
    throw new ApiError(403, "Requesters cannot accept their own task");
  }

  if (existingTask.assignedRunner) {
    throw new ApiError(409, "Task has already been accepted by another runner");
  }

  if (existingTask.status !== "open") {
    throw new ApiError(
      409,
      `Only open tasks can be accepted. Current status: ${existingTask.status}`,
    );
  }

  if (req.user.role !== "admin") {
    ensureUserHasCampusAccess(req.user, existingTask.campus, "accept");
  }

  const acceptedAt = new Date();
  const assignmentExpiresAt = calculateAssignmentExpiryDate(acceptedAt);

  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      requestedBy: { $ne: req.user._id },
      assignedRunner: null,
      status: "open",
      isArchived: false,
    },
    {
      $set: {
        status: "accepted",
        assignedRunner: req.user._id,
        acceptedAt,
        assignmentExpiresAt,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: "",
      },
    },
    {
      returnDocument: "after",
    },
  ).populate(detailedTaskPopulateFields);

  if (!task) {
    throw new ApiError(409, "Task acceptance failed because it was already taken");
  }

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task accepted successfully"));
});

const markTaskInProgress = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  ensureTaskNotArchived(task);
  ensureAssignedRunner(task, req.user);
  assertTransitionAllowed(task, "in_progress");

  task.status = "in_progress";
  task.startedAt = new Date();
  task.assignmentExpiresAt = null;

  await task.save();
  await task.populate(detailedTaskPopulateFields);

  res.status(200).json(
    new ApiResponse(200, sanitizeTask(task), "Task marked as in progress successfully"),
  );
});

const completeTask = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  ensureTaskNotArchived(task);
  ensureAssignedRunner(task, req.user);
  assertTransitionAllowed(task, "completed");

  task.status = "completed";
  task.completedAt = new Date();
  task.assignmentExpiresAt = null;

  await task.save();
  await task.populate(detailedTaskPopulateFields);
  await evaluateTaskForFraudFlags(task, "completed");
  const settlementResult = await settleRunnerEarningsForTask({
    taskId: task._id,
    initiatedBy: req.user._id,
  });

  await Promise.all([
    awardReferralForUserIfEligible({
      inviteeId: task.requestedBy?._id || task.requestedBy,
      taskId: task._id,
      initiatedBy: req.user._id,
    }),
    awardReferralForUserIfEligible({
      inviteeId: task.assignedRunner?._id || task.assignedRunner,
      taskId: task._id,
      initiatedBy: req.user._id,
    }),
  ]);

  const settledTask = await Task.findById(settlementResult.task._id).populate(
    detailedTaskPopulateFields,
  );

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(settledTask), "Task completed successfully"));
});

const cancelTask = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);
  const { cancellationReason } = req.body;

  ensureTaskNotArchived(task);
  ensureTaskRequesterOrAdmin(task, req.user);
  assertTransitionAllowed(task, "cancelled");

  task.status = "cancelled";
  task.cancelledAt = new Date();
  task.cancellationReason = cancellationReason?.trim() || "Cancelled by requester";
  task.assignmentExpiresAt = null;

  await task.save();
  await task.populate(detailedTaskPopulateFields);
  await evaluateTaskForFraudFlags(task, "cancelled");

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task cancelled successfully"));
});

const listProtectedTaskActions = asyncHandler(async (req, res) => {
  const allowedActions =
    req.user.role === "requester"
      ? ["create-task", "list-open-tasks", "list-own-task-history", "cancel-own-task"]
      : req.user.role === "runner"
        ? [
            "list-open-tasks",
            "accept-task",
            "mark-task-in-progress",
            "complete-task",
          ]
        : [
            "create-task",
            "list-all-tasks",
            "list-open-tasks",
            "accept-task",
            "mark-task-in-progress",
            "complete-task",
            "cancel-task",
          ];

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
        },
        allowedActions,
        lifecycle: taskTransitionMap,
      },
      "Protected task actions fetched successfully",
    ),
  );
});

export {
  acceptTask,
  addTaskAttachment,
  cancelTask,
  completeTask,
  createTask,
  getTaskById,
  listRequesterTaskHistory,
  listTasks,
  listOpenTasks,
  listProtectedTaskActions,
  markTaskInProgress,
  previewTaskQuote,
  removeTaskAttachment,
};