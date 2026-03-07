import mongoose from "mongoose";

import { allowedTaskStatuses, allowedTransportModes, Task } from "../models/task.model.js";
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
  campus: task.campus,
  transportMode: task.transportMode,
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

const resolveTaskFeedQuery = (query, overrides = {}) => {
  const {
    status,
    campus,
    transportMode,
    search,
    requestedBy,
    assignedRunner,
    page = 1,
    limit = 20,
    sort = "desc",
    cursor,
  } = query;

  const filters = {};

  const resolvedStatus = overrides.status || status;
  if (resolvedStatus) {
    if (!allowedTaskStatuses.includes(resolvedStatus)) {
      throw new ApiError(400, "Invalid task status filter");
    }

    filters.status = resolvedStatus;
  }

  const resolvedCampus = overrides.campus || campus;
  if (resolvedCampus) {
    filters.campus = resolvedCampus.trim();
  }

  const resolvedTransportMode = overrides.transportMode || transportMode;
  if (resolvedTransportMode) {
    if (!allowedTransportModes.includes(resolvedTransportMode)) {
      throw new ApiError(400, "Invalid transport mode filter");
    }

    filters.transportMode = resolvedTransportMode;
  }

  if (requestedBy) {
    ensureValidTaskId(requestedBy);
    filters.requestedBy = requestedBy;
  }

  if (assignedRunner) {
    ensureValidTaskId(assignedRunner);
    filters.assignedRunner = assignedRunner;
  }

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    filters.$or = [
      { title: pattern },
      { description: pattern },
      { pickupLocation: pattern },
      { dropoffLocation: pattern },
      { campus: pattern },
    ];
  }

  const resolvedSort = String(sort).toLowerCase() === "asc" ? 1 : -1;
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const decodedCursor = cursor ? decodeCursor(cursor) : null;

  if (decodedCursor) {
    filters.$or = [
      {
        createdAt: resolvedSort === -1 ? { $lt: decodedCursor.createdAt } : { $gt: decodedCursor.createdAt },
      },
      {
        createdAt: decodedCursor.createdAt,
        _id: resolvedSort === -1 ? { $lt: decodedCursor.id } : { $gt: decodedCursor.id },
      },
    ];

    if (search?.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      filters.$and = [
        {
          $or: [
            { title: pattern },
            { description: pattern },
            { pickupLocation: pattern },
            { dropoffLocation: pattern },
            { campus: pattern },
          ],
        },
        { $or: filters.$or },
      ];
      delete filters.$or;
    }
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
  const baseQuery = Task.find(filters).populate(populateTaskFields).sort(sortOrder);

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

  const task = await Task.findById(taskId).populate(populateTaskFields);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return task;
};

const fetchTaskForAssignment = async (taskId) => {
  ensureValidTaskId(taskId);

  const task = await Task.findById(taskId).select(
    "requestedBy assignedRunner status acceptedAt",
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

const createTask = asyncHandler(async (req, res) => {
  const { title, description, pickupLocation, dropoffLocation, campus, transportMode, reward } = req.body;

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

  if (transportMode && !allowedTransportModes.includes(transportMode)) {
    throw new ApiError(400, "Invalid transport mode provided");
  }

  const task = await Task.create({
    title: title.trim(),
    description: description.trim(),
    pickupLocation: pickupLocation.trim(),
    dropoffLocation: dropoffLocation.trim(),
    campus: campus?.trim() || "",
    transportMode: transportMode || "other",
    reward: normalizedReward,
    requestedBy: req.user._id,
  });

  const createdTask = await Task.findById(task._id).populate(populateTaskFields);

  res
    .status(201)
    .json(new ApiResponse(201, sanitizeTask(createdTask), "Task created successfully"));
});

const listOpenTasks = asyncHandler(async (req, res) => {
  const { items, pagination } = await fetchTaskFeed(req.query, { status: "open" });

  res
    .status(200)
    .json(
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
        },
      },
      "Tasks fetched successfully",
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

  const acceptedAt = new Date();

  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      requestedBy: { $ne: req.user._id },
      assignedRunner: null,
      status: "open",
    },
    {
      $set: {
        status: "accepted",
        assignedRunner: req.user._id,
        acceptedAt,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: "",
      },
    },
    {
      returnDocument: "after",
    },
  ).populate(populateTaskFields);

  if (!task) {
    throw new ApiError(409, "Task acceptance failed because it was already taken");
  }

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
  listTasks,
  listOpenTasks,
  listProtectedTaskActions,
  markTaskInProgress,
};