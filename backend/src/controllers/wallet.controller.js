import mongoose from "mongoose";

import { User } from "../models/user.model.js";
import {
  allowedWalletTransactionCategories,
  WalletTransaction,
  allowedWalletTransactionStatuses,
} from "../models/walletTransaction.model.js";
import { evaluateWalletTransactionForFraudFlags } from "../services/fraudDetection.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const transactionStatusTransitionMap = {
  pending: ["completed", "failed"],
  completed: [],
  failed: [],
};

const walletPopulateFields = [
  {
    path: "user",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "reviewedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
  {
    path: "initiatedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
];

const sanitizeWalletUser = (user) => {
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

const sanitizeTransaction = (transaction) => ({
  id: transaction._id,
  user: sanitizeWalletUser(transaction.user),
  type: transaction.type,
  amount: transaction.amount,
  status: transaction.status,
  category: transaction.category,
  description: transaction.description,
  reference: transaction.reference,
  sourceTaskId: transaction.sourceTask?._id || transaction.sourceTask || null,
  sourceDisputeId: transaction.sourceDispute?._id || transaction.sourceDispute || null,
  linkedTransactionId: transaction.linkedTransaction?._id || transaction.linkedTransaction || null,
  failureReason: transaction.failureReason,
  reviewedAt: transaction.reviewedAt,
  reviewNote: transaction.reviewNote,
  reviewedBy: sanitizeWalletUser(transaction.reviewedBy),
  initiatedBy: sanitizeWalletUser(transaction.initiatedBy),
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

const ensureValidObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName} provided`);
  }
};

const assertStatusTransitionAllowed = (currentStatus, nextStatus) => {
  const allowedStatuses = transactionStatusTransitionMap[currentStatus] || [];

  if (!allowedStatuses.includes(nextStatus)) {
    throw new ApiError(
      409,
      `Illegal wallet transaction status transition from ${currentStatus} to ${nextStatus}`,
    );
  }
};

const ensureUserExists = async (userId) => {
  ensureValidObjectId(userId, "user id");

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

const buildWalletSummary = async (userId) => {
  ensureValidObjectId(userId, "user id");

  const totals = await WalletTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalCredited: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "credit"] },
                  { $eq: ["$status", "completed"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        totalDebited: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "debit"] },
                  { $eq: ["$status", "completed"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        pendingCredits: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "credit"] },
                  { $eq: ["$status", "pending"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        pendingDebits: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "debit"] },
                  { $eq: ["$status", "pending"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        failedTransactions: {
          $sum: {
            $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
          },
        },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  const summary = totals[0] || {
    totalCredited: 0,
    totalDebited: 0,
    pendingCredits: 0,
    pendingDebits: 0,
    failedTransactions: 0,
    transactionCount: 0,
  };

  return {
    currentBalance: summary.totalCredited - summary.totalDebited,
    availableToWithdraw:
      summary.totalCredited - summary.totalDebited - summary.pendingDebits,
    totalCredited: summary.totalCredited,
    totalDebited: summary.totalDebited,
    pendingCredits: summary.pendingCredits,
    pendingDebits: summary.pendingDebits,
    failedTransactions: summary.failedTransactions,
    transactionCount: summary.transactionCount,
    currency: "INR",
  };
};

const createWalletTransaction = async ({
  type,
  amount,
  description,
  reference,
  status,
  userId,
  initiatedBy,
  category,
  reviewNote,
}) => {
  await ensureUserExists(userId);

  const normalizedAmount = Number(amount);
  if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, "description is required");
  }

  if (status && !allowedWalletTransactionStatuses.includes(status)) {
    throw new ApiError(400, "Invalid wallet transaction status provided");
  }

  if (category && !allowedWalletTransactionCategories.includes(category)) {
    throw new ApiError(400, "Invalid wallet transaction category provided");
  }

  const transaction = await WalletTransaction.create({
    user: userId,
    type,
    amount: normalizedAmount,
    description: description.trim(),
    reference: reference?.trim() || "",
    status: status || "completed",
    category: category || "manual",
    sourceTask: null,
    initiatedBy,
    failureReason: status === "failed" ? "Marked failed at creation" : "",
    reviewNote: reviewNote?.trim() || "",
  });

  return WalletTransaction.findById(transaction._id).populate(walletPopulateFields);
};

const buildWithdrawableBalance = async (userId) => {
  const summary = await buildWalletSummary(userId);

  return {
    ...summary,
    availableToWithdraw: Math.max(summary.availableToWithdraw, 0),
  };
};

const ensureRunnerCanWithdraw = async (userId) => {
  const user = await ensureUserExists(userId);

  if (user.role !== "runner") {
    throw new ApiError(403, "Only runners can submit wallet withdrawal requests");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Inactive runners cannot submit wallet withdrawal requests");
  }

  return user;
};

const fetchWithdrawalRequestOrThrow = async (transactionId) => {
  ensureValidObjectId(transactionId, "transaction id");

  const transaction = await WalletTransaction.findById(transactionId).populate(
    walletPopulateFields,
  );

  if (!transaction) {
    throw new ApiError(404, "Wallet withdrawal request not found");
  }

  if (transaction.category !== "withdrawal_request" || transaction.type !== "debit") {
    throw new ApiError(400, "Transaction is not a wallet withdrawal request");
  }

  return transaction;
};

const getMyWalletBalance = asyncHandler(async (req, res) => {
  const balance = await buildWithdrawableBalance(req.user._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        userId: req.user._id,
        ...balance,
      },
      "Wallet balance fetched successfully",
    ),
  );
});

const listWalletTransactions = asyncHandler(async (req, res) => {
  const { status, type, category, userId, page = 1, limit = 20 } = req.query;

  const filters = {};
  const resolvedPage = Math.max(Number(page) || 1, 1);
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (status) {
    if (!allowedWalletTransactionStatuses.includes(status)) {
      throw new ApiError(400, "Invalid wallet transaction status filter");
    }

    filters.status = status;
  }

  if (type) {
    if (!["credit", "debit"].includes(type)) {
      throw new ApiError(400, "Invalid wallet transaction type filter");
    }

    filters.type = type;
  }

  if (category) {
    if (!allowedWalletTransactionCategories.includes(category)) {
      throw new ApiError(400, "Invalid wallet transaction category filter");
    }

    filters.category = category;
  }

  if (req.user.role === "admin" && userId) {
    await ensureUserExists(userId);
    filters.user = userId;
  } else {
    filters.user = req.user._id;
  }

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filters)
      .populate(walletPopulateFields)
      .sort({ createdAt: -1 })
      .skip((resolvedPage - 1) * resolvedLimit)
      .limit(resolvedLimit),
    WalletTransaction.countDocuments(filters),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: transactions.map(sanitizeTransaction),
        pagination: {
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit) || 1,
        },
        filters: {
          status: status || "",
          type: type || "",
          category: category || "",
        },
      },
      "Wallet transactions fetched successfully",
    ),
  );
});

const createCreditTransaction = asyncHandler(async (req, res) => {
  const { userId, amount, description, reference, status } = req.body;

  const transaction = await createWalletTransaction({
    type: "credit",
    userId,
    amount,
    description,
    reference,
    status,
    initiatedBy: req.user._id,
    category: "manual",
  });

  await evaluateWalletTransactionForFraudFlags(transaction);

  res.status(201).json(
    new ApiResponse(
      201,
      sanitizeTransaction(transaction),
      "Wallet credit transaction created successfully",
    ),
  );
});

const createDebitTransaction = asyncHandler(async (req, res) => {
  const { userId, amount, description, reference, status } = req.body;

  const balance = await buildWithdrawableBalance(userId);
  const normalizedAmount = Number(amount);

  if (!status || status === "completed") {
    if (Number.isNaN(normalizedAmount) || normalizedAmount > balance.currentBalance) {
      throw new ApiError(400, "Insufficient wallet balance for this debit transaction");
    }
  }

  const transaction = await createWalletTransaction({
    type: "debit",
    userId,
    amount,
    description,
    reference,
    status,
    initiatedBy: req.user._id,
    category: "manual",
  });

  await evaluateWalletTransactionForFraudFlags(transaction);

  res.status(201).json(
    new ApiResponse(
      201,
      sanitizeTransaction(transaction),
      "Wallet debit transaction created successfully",
    ),
  );
});

const createWithdrawalRequest = asyncHandler(async (req, res) => {
  const { amount, reference, reviewNote } = req.body;

  await ensureRunnerCanWithdraw(req.user._id);

  const normalizedAmount = Number(amount);
  if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }

  const balance = await buildWithdrawableBalance(req.user._id);
  if (normalizedAmount > balance.availableToWithdraw) {
    throw new ApiError(400, "Insufficient available wallet balance for withdrawal request");
  }

  const transaction = await createWalletTransaction({
    type: "debit",
    userId: req.user._id,
    amount: normalizedAmount,
    description: "Runner withdrawal request",
    reference,
    status: "pending",
    initiatedBy: req.user._id,
    category: "withdrawal_request",
    reviewNote,
  });

  res.status(201).json(
    new ApiResponse(
      201,
      sanitizeTransaction(transaction),
      "Wallet withdrawal request submitted successfully",
    ),
  );
});

const approveWithdrawalRequest = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reviewNote } = req.body;

  const transaction = await fetchWithdrawalRequestOrThrow(transactionId);
  assertStatusTransitionAllowed(transaction.status, "completed");

  const balance = await buildWalletSummary(transaction.user._id);
  if (transaction.amount > balance.currentBalance) {
    throw new ApiError(400, "Insufficient wallet balance to approve this withdrawal request");
  }

  transaction.status = "completed";
  transaction.failureReason = "";
  transaction.reviewNote = reviewNote?.trim() || "Approved by admin";
  transaction.reviewedAt = new Date();
  transaction.reviewedBy = req.user._id;

  await transaction.save();
  await transaction.populate(walletPopulateFields);

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeTransaction(transaction),
      "Wallet withdrawal request approved successfully",
    ),
  );
});

const rejectWithdrawalRequest = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { failureReason, reviewNote } = req.body;

  const transaction = await fetchWithdrawalRequestOrThrow(transactionId);
  assertStatusTransitionAllowed(transaction.status, "failed");

  transaction.status = "failed";
  transaction.failureReason = failureReason?.trim() || "Withdrawal request rejected";
  transaction.reviewNote = reviewNote?.trim() || transaction.failureReason;
  transaction.reviewedAt = new Date();
  transaction.reviewedBy = req.user._id;

  await transaction.save();
  await transaction.populate(walletPopulateFields);

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeTransaction(transaction),
      "Wallet withdrawal request rejected successfully",
    ),
  );
});

const updateWalletTransactionStatus = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { status, failureReason } = req.body;

  ensureValidObjectId(transactionId, "transaction id");

  if (!allowedWalletTransactionStatuses.includes(status)) {
    throw new ApiError(400, "Invalid wallet transaction status provided");
  }

  const transaction = await WalletTransaction.findById(transactionId).populate(
    walletPopulateFields,
  );

  if (!transaction) {
    throw new ApiError(404, "Wallet transaction not found");
  }

  assertStatusTransitionAllowed(transaction.status, status);

  if (transaction.type === "debit" && status === "completed") {
    const balance = await buildWalletSummary(transaction.user._id);
    if (transaction.amount > balance.currentBalance) {
      throw new ApiError(400, "Insufficient wallet balance to complete this debit");
    }
  }

  transaction.status = status;
  transaction.failureReason = status === "failed" ? failureReason?.trim() || "Marked as failed" : "";

  await transaction.save();
  await transaction.populate(walletPopulateFields);
  await evaluateWalletTransactionForFraudFlags(transaction);

  res.status(200).json(
    new ApiResponse(
      200,
      sanitizeTransaction(transaction),
      "Wallet transaction status updated successfully",
    ),
  );
});

export {
  approveWithdrawalRequest,
  createCreditTransaction,
  createDebitTransaction,
  createWithdrawalRequest,
  getMyWalletBalance,
  listWalletTransactions,
  rejectWithdrawalRequest,
  updateWalletTransactionStatus,
};