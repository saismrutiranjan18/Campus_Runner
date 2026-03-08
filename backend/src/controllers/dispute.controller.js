import mongoose from "mongoose";

import {
  allowedDisputeStatuses,
  Dispute,
} from "../models/dispute.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const disputePopulateFields = [
  {
    path: "openedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "reviewedBy",
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
    requestedBy: sanitizeUser(task.requestedBy),
    assignedRunner: sanitizeUser(task.assignedRunner),
    isArchived: task.isArchived,
    archivedAt: task.archivedAt,
    archiveReason: task.archiveReason,
    archivedBy: sanitizeUser(task.archivedBy),
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

const sanitizeEvidence = (evidence = []) => {
  return evidence.map((item) => ({
    type: item.type,
    label: item.label,
    url: item.url,
    note: item.note,
  }));
};

const sanitizeDispute = (dispute) => ({
  id: dispute._id,
  task: sanitizeTask(dispute.task),
  openedBy: sanitizeUser(dispute.openedBy),
  openedByRole: dispute.openedByRole,
  reason: dispute.reason,
  details: dispute.details,
  evidence: sanitizeEvidence(dispute.evidence),
  status: dispute.status,
  resolutionNote: dispute.resolutionNote,
  reviewedBy: sanitizeUser(dispute.reviewedBy),
  reviewedAt: dispute.reviewedAt,
  createdAt: dispute.createdAt,
  updatedAt: dispute.updatedAt,
});

const ensureValidObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName} provided`);
  }
};

const normalizeEvidence = (evidence) => {
  if (evidence === undefined) {
    return [];
  }

  if (!Array.isArray(evidence)) {
    throw new ApiError(400, "evidence must be an array when provided");
  }

  return evidence.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ApiError(400, `evidence[${index}] must be an object`);
    }

    return {
      type: item.type?.trim() || "link",
      label: item.label?.trim() || "",
      url: item.url?.trim() || "",
      note: item.note?.trim() || "",
    };
  });
};

const ensureTaskParticipantRole = (task, user) => {
  if (task.requestedBy && String(task.requestedBy._id) === String(user._id)) {
    return "requester";
  }

  if (task.assignedRunner && String(task.assignedRunner._id) === String(user._id)) {
    return "runner";
  }

  throw new ApiError(403, "Only the requester or assigned runner can open a dispute for this task");
};

const ensureDisputeReadableByUser = (dispute, user) => {
  if (user.role === "admin") {
    return;
  }

  const task = dispute.task;
  const isOpenedByUser = String(dispute.openedBy._id) === String(user._id);
  const isRequester = task?.requestedBy && String(task.requestedBy._id) === String(user._id);
  const isAssignedRunner =
    task?.assignedRunner && String(task.assignedRunner._id) === String(user._id);

  if (!isOpenedByUser && !isRequester && !isAssignedRunner) {
    throw new ApiError(403, "You are not allowed to access this dispute");
  }
};

const createDispute = asyncHandler(async (req, res) => {
  const { taskId, reason, details, evidence } = req.body;

  ensureValidObjectId(taskId, "task id");

  if (!reason || !reason.trim()) {
    throw new ApiError(400, "reason is required");
  }

  const task = await Task.findById(taskId)
    .populate("requestedBy", "fullName email phoneNumber role isVerified isActive")
    .populate("assignedRunner", "fullName email phoneNumber role isVerified isActive")
    .populate("archivedBy", "fullName email phoneNumber role isVerified isActive");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (!["completed", "cancelled"].includes(task.status)) {
    throw new ApiError(409, "Disputes can only be opened for completed or cancelled tasks");
  }

  const openedByRole = ensureTaskParticipantRole(task, req.user);

  const existingDispute = await Dispute.findOne({
    task: taskId,
    openedBy: req.user._id,
  });

  if (existingDispute) {
    throw new ApiError(409, "You have already opened a dispute for this task");
  }

  const dispute = await Dispute.create({
    task: taskId,
    openedBy: req.user._id,
    openedByRole,
    reason: reason.trim(),
    details: details?.trim() || "",
    evidence: normalizeEvidence(evidence),
  });

  const createdDispute = await Dispute.findById(dispute._id).populate(disputePopulateFields);

  res.status(201).json(
    new ApiResponse(201, sanitizeDispute(createdDispute), "Dispute opened successfully"),
  );
});

const listMyDisputes = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filters = { openedBy: req.user._id };
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (status) {
    if (!allowedDisputeStatuses.includes(status)) {
      throw new ApiError(400, "Invalid dispute status filter");
    }

    filters.status = status;
  }

  const [disputes, total] = await Promise.all([
    Dispute.find(filters)
      .populate(disputePopulateFields)
      .sort({ createdAt: -1 })
      .skip((resolvedPage - 1) * resolvedLimit)
      .limit(resolvedLimit),
    Dispute.countDocuments(filters),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: disputes.map(sanitizeDispute),
        pagination: {
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit) || 1,
        },
        filters: {
          status: status || "",
        },
      },
      "Disputes fetched successfully",
    ),
  );
});

const getDisputeById = asyncHandler(async (req, res) => {
  const { disputeId } = req.params;
  ensureValidObjectId(disputeId, "dispute id");

  const dispute = await Dispute.findById(disputeId).populate(disputePopulateFields);

  if (!dispute) {
    throw new ApiError(404, "Dispute not found");
  }

  ensureDisputeReadableByUser(dispute, req.user);

  res.status(200).json(
    new ApiResponse(200, sanitizeDispute(dispute), "Dispute fetched successfully"),
  );
});

const listAllDisputes = asyncHandler(async (req, res) => {
  const { status, openedByRole, taskId, page = 1, limit = 20 } = req.query;
  const filters = {};
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (status) {
    if (!allowedDisputeStatuses.includes(status)) {
      throw new ApiError(400, "Invalid dispute status filter");
    }

    filters.status = status;
  }

  if (openedByRole) {
    if (!["requester", "runner"].includes(openedByRole)) {
      throw new ApiError(400, "Invalid dispute openedByRole filter");
    }

    filters.openedByRole = openedByRole;
  }

  if (taskId) {
    ensureValidObjectId(taskId, "task id");
    filters.task = taskId;
  }

  const [disputes, total] = await Promise.all([
    Dispute.find(filters)
      .populate(disputePopulateFields)
      .sort({ createdAt: -1 })
      .skip((resolvedPage - 1) * resolvedLimit)
      .limit(resolvedLimit),
    Dispute.countDocuments(filters),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: disputes.map(sanitizeDispute),
        pagination: {
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit) || 1,
        },
        filters: {
          status: status || "",
          openedByRole: openedByRole || "",
          taskId: taskId || "",
        },
      },
      "Disputes fetched successfully",
    ),
  );
});

const updateDisputeStatus = asyncHandler(async (req, res) => {
  const { disputeId } = req.params;
  const { status, resolutionNote } = req.body;

  ensureValidObjectId(disputeId, "dispute id");

  if (!allowedDisputeStatuses.includes(status) || status === "open") {
    throw new ApiError(400, "Invalid dispute status provided");
  }

  const dispute = await Dispute.findById(disputeId).populate(disputePopulateFields);
  if (!dispute) {
    throw new ApiError(404, "Dispute not found");
  }

  dispute.status = status;
  dispute.reviewedBy = req.user._id;
  dispute.reviewedAt = new Date();
  dispute.resolutionNote = resolutionNote?.trim() || "";

  await dispute.save();
  await dispute.populate(disputePopulateFields);

  res.status(200).json(
    new ApiResponse(200, sanitizeDispute(dispute), "Dispute status updated successfully"),
  );
});

export {
  createDispute,
  getDisputeById,
  listAllDisputes,
  listMyDisputes,
  updateDisputeStatus,
};