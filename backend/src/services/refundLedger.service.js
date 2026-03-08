import mongoose from "mongoose";

import { Task } from "../models/task.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";

const allowedRefundTriggerTypes = ["cancellation", "dispute", "failed_completion"];

const buildReference = (prefix, taskId, sequenceNumber) => {
  return `${prefix}-${taskId}-${sequenceNumber}`;
};

const buildCurrentBalance = async (userId) => {
  const totals = await WalletTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        credits: {
          $sum: {
            $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0],
          },
        },
        debits: {
          $sum: {
            $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0],
          },
        },
      },
    },
  ]);

  const summary = totals[0] || { credits: 0, debits: 0 };
  return summary.credits - summary.debits;
};

const applyTaskRefund = async ({
  taskId,
  amount,
  reason,
  triggerType,
  initiatedBy,
  disputeId = null,
}) => {
  if (!allowedRefundTriggerTypes.includes(triggerType)) {
    throw new ApiError(400, "Invalid refund triggerType provided");
  }

  const task = await Task.findById(taskId)
    .populate("requestedBy", "_id fullName email phoneNumber role isVerified isActive")
    .populate("assignedRunner", "_id fullName email phoneNumber role isVerified isActive");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (!["completed", "cancelled"].includes(task.status)) {
    throw new ApiError(409, "Refunds can only be applied to completed or cancelled tasks");
  }

  const requestedAmount = amount === undefined ? task.reward - task.refundedAmount : Number(amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }

  const remainingRefundableAmount = Math.max(task.reward - task.refundedAmount, 0);
  if (requestedAmount > remainingRefundableAmount) {
    throw new ApiError(409, "Refund amount exceeds the remaining refundable task value");
  }

  const refundSequenceNumber = task.refundTransactions.length + 1;
  const requesterRefundReference = buildReference("TASK-REFUND", task._id, refundSequenceNumber);
  const requesterRefund = await WalletTransaction.create({
    user: task.requestedBy._id,
    type: "credit",
    amount: requestedAmount,
    status: "completed",
    category: "refund",
    description: `Refund for task ${task.title}`,
    reference: requesterRefundReference,
    sourceTask: task._id,
    sourceDispute: disputeId,
    initiatedBy,
    failureReason: "",
    reviewNote: reason?.trim() || `${triggerType} refund applied`,
  });

  let runnerReversal = null;
  if (task.settlementStatus === "settled" && task.assignedRunner) {
    const runnerBalance = await buildCurrentBalance(task.assignedRunner._id);
    if (requestedAmount > runnerBalance) {
      throw new ApiError(409, "Runner balance is insufficient to reverse the settled payout");
    }

    runnerReversal = await WalletTransaction.create({
      user: task.assignedRunner._id,
      type: "debit",
      amount: requestedAmount,
      status: "completed",
      category: "reversal",
      description: `Settlement reversal for task ${task.title}`,
      reference: buildReference("TASK-REVERSAL", task._id, refundSequenceNumber),
      sourceTask: task._id,
      sourceDispute: disputeId,
      linkedTransaction: requesterRefund._id,
      initiatedBy,
      failureReason: "",
      reviewNote: reason?.trim() || `${triggerType} reversal applied`,
    });

    requesterRefund.linkedTransaction = runnerReversal._id;
    await requesterRefund.save({ validateBeforeSave: false });
  }

  task.refundedAmount += requestedAmount;
  task.refundStatus = task.refundedAmount >= task.reward ? "full" : "partial";
  task.lastRefundedAt = new Date();
  task.refundTransactions.push(requesterRefund._id);

  if (runnerReversal) {
    task.refundTransactions.push(runnerReversal._id);
  }

  await task.save();

  return {
    task,
    refundAmount: requestedAmount,
    requesterRefund,
    runnerReversal,
  };
};

export { allowedRefundTriggerTypes, applyTaskRefund };