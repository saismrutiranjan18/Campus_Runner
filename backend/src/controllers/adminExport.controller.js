import mongoose from "mongoose";

import { Report, allowedReportEntityTypes, allowedReportStatuses } from "../models/report.model.js";
import { Task, allowedTaskStatuses, allowedTransportModes } from "../models/task.model.js";
import { User, allowedRoles } from "../models/user.model.js";
import {
  WalletTransaction,
  allowedWalletTransactionCategories,
  allowedWalletTransactionStatuses,
  allowedWalletTransactionTypes,
} from "../models/walletTransaction.model.js";
import { buildCsvFromRows } from "../utils/exportFormatter.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MAX_EXPORT_LIMIT = 5000;
const DEFAULT_EXPORT_LIMIT = 1000;

const baseUserSelection = "fullName email phoneNumber role isVerified isActive campusId campusName";

const taskPopulateFields = [
  { path: "requestedBy", select: baseUserSelection },
  { path: "assignedRunner", select: baseUserSelection },
  { path: "archivedBy", select: baseUserSelection },
];

const reportPopulateFields = [
  { path: "reporter", select: baseUserSelection },
  { path: "reportedUser", select: baseUserSelection },
  { path: "reviewedBy", select: baseUserSelection },
  {
    path: "reportedTask",
    populate: [
      { path: "requestedBy", select: baseUserSelection },
      { path: "assignedRunner", select: baseUserSelection },
      { path: "archivedBy", select: baseUserSelection },
    ],
  },
];

const walletPopulateFields = [
  { path: "user", select: baseUserSelection },
  { path: "reviewedBy", select: baseUserSelection },
  { path: "initiatedBy", select: baseUserSelection },
];

const ensureValidObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName} provided`);
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const applyCreatedAtRange = (filters, query) => {
  const fromDate = parseDateFilter(query.fromDate, "fromDate", "start");
  const toDate = parseDateFilter(query.toDate, "toDate", "end");

  if (fromDate && toDate && fromDate > toDate) {
    throw new ApiError(400, "fromDate cannot be later than toDate");
  }

  if (fromDate || toDate) {
    filters.createdAt = {};

    if (fromDate) {
      filters.createdAt.$gte = fromDate;
    }

    if (toDate) {
      filters.createdAt.$lte = toDate;
    }
  }
};

const resolveExportOptions = (req) => {
  const resource = String(req.params.resource || "").trim().toLowerCase();
  const format = String(req.query.format || "json").trim().toLowerCase();
  const limit = Math.min(
    Math.max(Number(req.query.limit) || DEFAULT_EXPORT_LIMIT, 1),
    MAX_EXPORT_LIMIT,
  );
  const sort = String(req.query.sort || "desc").toLowerCase() === "asc" ? 1 : -1;

  if (!["json", "csv"].includes(format)) {
    throw new ApiError(400, "format must be either csv or json");
  }

  return {
    resource,
    format,
    limit,
    sort,
  };
};

const buildTaskExportFilters = (query) => {
  const filters = {};

  if (query.status) {
    if (!allowedTaskStatuses.includes(query.status)) {
      throw new ApiError(400, "Invalid task status filter");
    }

    filters.status = query.status;
  }

  if (query.transportMode) {
    if (!allowedTransportModes.includes(query.transportMode)) {
      throw new ApiError(400, "Invalid transport mode filter");
    }

    filters.transportMode = query.transportMode;
  }

  if (query.campus?.trim()) {
    filters.campus = query.campus.trim();
  }

  if (query.requestedBy) {
    ensureValidObjectId(query.requestedBy, "requestedBy");
    filters.requestedBy = query.requestedBy;
  }

  if (query.assignedRunner) {
    ensureValidObjectId(query.assignedRunner, "assignedRunner");
    filters.assignedRunner = query.assignedRunner;
  }

  if (query.archived !== undefined) {
    filters.isArchived = String(query.archived).toLowerCase() === "true";
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
    filters.$or = [
      { title: pattern },
      { description: pattern },
      { pickupLocation: pattern },
      { dropoffLocation: pattern },
      { campus: pattern },
    ];
  }

  applyCreatedAtRange(filters, query);
  return filters;
};

const buildReportExportFilters = (query) => {
  const filters = {};

  if (query.status) {
    if (!allowedReportStatuses.includes(query.status)) {
      throw new ApiError(400, "Invalid report status filter");
    }

    filters.status = query.status;
  }

  if (query.entityType) {
    if (!allowedReportEntityTypes.includes(query.entityType)) {
      throw new ApiError(400, "Invalid report entity type filter");
    }

    filters.entityType = query.entityType;
  }

  if (query.reporterId) {
    ensureValidObjectId(query.reporterId, "reporterId");
    filters.reporter = query.reporterId;
  }

  if (query.reportedUserId) {
    ensureValidObjectId(query.reportedUserId, "reportedUserId");
    filters.reportedUser = query.reportedUserId;
  }

  if (query.reportedTaskId) {
    ensureValidObjectId(query.reportedTaskId, "reportedTaskId");
    filters.reportedTask = query.reportedTaskId;
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
    filters.$or = [{ reason: pattern }, { details: pattern }, { resolutionNote: pattern }];
  }

  applyCreatedAtRange(filters, query);
  return filters;
};

const buildWalletExportFilters = (query) => {
  const filters = {};

  if (query.status) {
    if (!allowedWalletTransactionStatuses.includes(query.status)) {
      throw new ApiError(400, "Invalid wallet transaction status filter");
    }

    filters.status = query.status;
  }

  if (query.type) {
    if (!allowedWalletTransactionTypes.includes(query.type)) {
      throw new ApiError(400, "Invalid wallet transaction type filter");
    }

    filters.type = query.type;
  }

  if (query.category) {
    if (!allowedWalletTransactionCategories.includes(query.category)) {
      throw new ApiError(400, "Invalid wallet transaction category filter");
    }

    filters.category = query.category;
  }

  if (query.userId) {
    ensureValidObjectId(query.userId, "userId");
    filters.user = query.userId;
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
    filters.$or = [{ description: pattern }, { reference: pattern }, { failureReason: pattern }];
  }

  applyCreatedAtRange(filters, query);
  return filters;
};

const buildUserExportFilters = (query) => {
  const filters = {};

  if (query.role) {
    if (!allowedRoles.includes(query.role)) {
      throw new ApiError(400, "Invalid user role filter");
    }

    filters.role = query.role;
  }

  if (query.active !== undefined) {
    filters.isActive = String(query.active).toLowerCase() === "true";
  }

  if (query.verified !== undefined) {
    filters.isVerified = String(query.verified).toLowerCase() === "true";
  }

  if (query.campusId?.trim()) {
    filters.campusId = query.campusId.trim();
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
    filters.$or = [
      { fullName: pattern },
      { email: pattern },
      { phoneNumber: pattern },
      { campusName: pattern },
    ];
  }

  applyCreatedAtRange(filters, query);
  return filters;
};

const mapTaskExportRow = (task) => ({
  id: task._id.toString(),
  title: task.title,
  description: task.description,
  pickupLocation: task.pickupLocation,
  dropoffLocation: task.dropoffLocation,
  campus: task.campus,
  transportMode: task.transportMode,
  reward: task.reward,
  status: task.status,
  isArchived: task.isArchived,
  requestedBy: task.requestedBy
    ? {
        id: task.requestedBy._id.toString(),
        fullName: task.requestedBy.fullName,
        email: task.requestedBy.email,
        role: task.requestedBy.role,
      }
    : null,
  assignedRunner: task.assignedRunner
    ? {
        id: task.assignedRunner._id.toString(),
        fullName: task.assignedRunner.fullName,
        email: task.assignedRunner.email,
        role: task.assignedRunner.role,
      }
    : null,
  archivedBy: task.archivedBy
    ? {
        id: task.archivedBy._id.toString(),
        fullName: task.archivedBy.fullName,
        email: task.archivedBy.email,
      }
    : null,
  acceptedAt: task.acceptedAt,
  startedAt: task.startedAt,
  completedAt: task.completedAt,
  cancelledAt: task.cancelledAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const mapReportExportRow = (report) => ({
  id: report._id.toString(),
  entityType: report.entityType,
  reason: report.reason,
  details: report.details,
  status: report.status,
  reporter: report.reporter
    ? {
        id: report.reporter._id.toString(),
        fullName: report.reporter.fullName,
        email: report.reporter.email,
        role: report.reporter.role,
      }
    : null,
  reportedUser: report.reportedUser
    ? {
        id: report.reportedUser._id.toString(),
        fullName: report.reportedUser.fullName,
        email: report.reportedUser.email,
        role: report.reportedUser.role,
      }
    : null,
  reportedTask: report.reportedTask
    ? {
        id: report.reportedTask._id.toString(),
        title: report.reportedTask.title,
        status: report.reportedTask.status,
      }
    : null,
  reviewedBy: report.reviewedBy
    ? {
        id: report.reviewedBy._id.toString(),
        fullName: report.reviewedBy.fullName,
        email: report.reviewedBy.email,
      }
    : null,
  reviewedAt: report.reviewedAt,
  resolutionNote: report.resolutionNote,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
});

const mapWalletExportRow = (transaction) => ({
  id: transaction._id.toString(),
  type: transaction.type,
  amount: transaction.amount,
  status: transaction.status,
  category: transaction.category,
  description: transaction.description,
  reference: transaction.reference,
  failureReason: transaction.failureReason,
  user: transaction.user
    ? {
        id: transaction.user._id.toString(),
        fullName: transaction.user.fullName,
        email: transaction.user.email,
        role: transaction.user.role,
      }
    : null,
  initiatedBy: transaction.initiatedBy
    ? {
        id: transaction.initiatedBy._id.toString(),
        fullName: transaction.initiatedBy.fullName,
        email: transaction.initiatedBy.email,
      }
    : null,
  reviewedBy: transaction.reviewedBy
    ? {
        id: transaction.reviewedBy._id.toString(),
        fullName: transaction.reviewedBy.fullName,
        email: transaction.reviewedBy.email,
      }
    : null,
  sourceTaskId: transaction.sourceTask?._id?.toString() || transaction.sourceTask?.toString() || "",
  reviewedAt: transaction.reviewedAt,
  reviewNote: transaction.reviewNote,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

const mapUserExportRow = (user) => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  campusId: user.campusId,
  campusName: user.campusName,
  campusScopes: (user.campusScopes || []).map(
    (scope) => `${scope.campusId || ""}:${scope.campusName || ""}`,
  ),
  isVerified: user.isVerified,
  isActive: user.isActive,
  suspendedAt: user.suspendedAt,
  suspensionReason: user.suspensionReason,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const exportResourceResolvers = {
  tasks: {
    buildFilters: buildTaskExportFilters,
    fetch: async ({ filters, sort, limit }) =>
      Task.find(filters).populate(taskPopulateFields).sort({ createdAt: sort, _id: sort }).limit(limit),
    mapRow: mapTaskExportRow,
  },
  reports: {
    buildFilters: buildReportExportFilters,
    fetch: async ({ filters, sort, limit }) =>
      Report.find(filters).populate(reportPopulateFields).sort({ createdAt: sort, _id: sort }).limit(limit),
    mapRow: mapReportExportRow,
  },
  "wallet-transactions": {
    buildFilters: buildWalletExportFilters,
    fetch: async ({ filters, sort, limit }) =>
      WalletTransaction.find(filters)
        .populate(walletPopulateFields)
        .sort({ createdAt: sort, _id: sort })
        .limit(limit),
    mapRow: mapWalletExportRow,
  },
  users: {
    buildFilters: buildUserExportFilters,
    fetch: async ({ filters, sort, limit }) =>
      User.find(filters).sort({ createdAt: sort, _id: sort }).limit(limit),
    mapRow: mapUserExportRow,
  },
};

const buildFilename = (resource, format) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `admin-${resource}-export-${stamp}.${format}`;
};

const exportAdminResource = asyncHandler(async (req, res) => {
  const { resource, format, limit, sort } = resolveExportOptions(req);
  const resolver = exportResourceResolvers[resource];

  if (!resolver) {
    throw new ApiError(
      400,
      "resource must be one of tasks, reports, wallet-transactions, or users",
    );
  }

  const filters = resolver.buildFilters(req.query);
  const documents = await resolver.fetch({ filters, sort, limit });
  const rows = documents.map((document) => resolver.mapRow(document));
  const filename = buildFilename(resource, format);

  res.set("Content-Disposition", `attachment; filename="${filename}"`);

  if (format === "csv") {
    res.type("text/csv");
    res.status(200).send(buildCsvFromRows(rows));
    return;
  }

  res.status(200).json({
    success: true,
    resource,
    format,
    exportedAt: new Date().toISOString(),
    count: rows.length,
    filters: req.query,
    items: rows,
  });
});

export { exportAdminResource };