import mongoose from "mongoose";

import { Task } from "../models/task.model.js";
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

const populateTaskFields = [
  {
    path: "requestedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "assignedRunner",
    select: "fullName email phoneNumber role isVerified isActive",
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
  reward: task.reward,
  status: task.status,
  requestedBy: sanitizeTaskUser(task.requestedBy),
  assignedRunner: sanitizeTaskUser(task.assignedRunner),
  acceptedAt: task.acceptedAt,
  startedAt: task.startedAt,
  completedAt: task.completedAt,
  cancelledAt: task.cancelledAt,
  cancellationReason: task.cancellationReason,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const ensureValidTaskId = (taskId) => {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid task id provided");
  }
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

  const task = await Task.findById(taskId).populate(populateTaskFields);

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

const createTask = asyncHandler(async (req, res) => {
  const { title, description, pickupLocation, dropoffLocation, reward } = req.body;

  if (!title || !description || !pickupLocation || !dropoffLocation) {
    throw new ApiError(
      400,
      "title, description, pickupLocation and dropoffLocation are required",
    );
  }

  const normalizedReward = reward === undefined ? 0 : Number(reward);
  if (Number.isNaN(normalizedReward) || normalizedReward < 0) {
    throw new ApiError(400, "reward must be a non-negative number");
  }

  const task = await Task.create({
    title: title.trim(),
    description: description.trim(),
    pickupLocation: pickupLocation.trim(),
    dropoffLocation: dropoffLocation.trim(),
    reward: normalizedReward,
    requestedBy: req.user._id,
  });

  const createdTask = await Task.findById(task._id).populate(populateTaskFields);

  res
    .status(201)
    .json(new ApiResponse(201, sanitizeTask(createdTask), "Task created successfully"));
});

const listOpenTasks = asyncHandler(async (_, res) => {
  const tasks = await Task.find({ status: "open" })
    .populate(populateTaskFields)
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, tasks.map(sanitizeTask), "Open tasks fetched successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task fetched successfully"));
});

const acceptTask = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  assertTransitionAllowed(task, "accepted");

  task.status = "accepted";
  task.assignedRunner = req.user._id;
  task.acceptedAt = new Date();
  task.startedAt = null;
  task.completedAt = null;
  task.cancelledAt = null;
  task.cancellationReason = "";

  await task.save();
  await task.populate(populateTaskFields);

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task accepted successfully"));
});

const markTaskInProgress = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  ensureAssignedRunner(task, req.user);
  assertTransitionAllowed(task, "in_progress");

  task.status = "in_progress";
  task.startedAt = new Date();

  await task.save();
  await task.populate(populateTaskFields);

  res.status(200).json(
    new ApiResponse(200, sanitizeTask(task), "Task marked as in progress successfully"),
  );
});

const completeTask = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);

  ensureAssignedRunner(task, req.user);
  assertTransitionAllowed(task, "completed");

  task.status = "completed";
  task.completedAt = new Date();

  await task.save();
  await task.populate(populateTaskFields);

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task completed successfully"));
});

const cancelTask = asyncHandler(async (req, res) => {
  const task = await fetchTaskOrThrow(req.params.taskId);
  const { cancellationReason } = req.body;

  ensureTaskRequesterOrAdmin(task, req.user);
  assertTransitionAllowed(task, "cancelled");

  task.status = "cancelled";
  task.cancelledAt = new Date();
  task.cancellationReason = cancellationReason?.trim() || "Cancelled by requester";

  await task.save();
  await task.populate(populateTaskFields);

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeTask(task), "Task cancelled successfully"));
});

const listProtectedTaskActions = asyncHandler(async (req, res) => {
  const allowedActions =
    req.user.role === "requester"
      ? ["create-task", "list-open-tasks", "cancel-own-task"]
      : req.user.role === "runner"
        ? ["list-open-tasks", "accept-task", "mark-task-in-progress", "complete-task"]
        : [
            "create-task",
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
  cancelTask,
  completeTask,
  createTask,
  getTaskById,
  listOpenTasks,
  listProtectedTaskActions,
  markTaskInProgress,
};