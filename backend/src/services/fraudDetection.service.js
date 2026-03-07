import { FraudFlag } from "../models/fraudFlag.model.js";
import { Task } from "../models/task.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";

const unresolvedFraudFlagStatuses = ["open", "reviewed"];

const recordFraudFlag = async ({
  fingerprint,
  flagType,
  severity,
  title,
  reason,
  metrics,
  user,
  secondaryUser,
  task,
  walletTransaction,
}) => {
  const existingFlag = await FraudFlag.findOne({
    fingerprint,
    status: { $in: unresolvedFraudFlagStatuses },
  });

  if (existingFlag) {
    existingFlag.severity = severity;
    existingFlag.title = title;
    existingFlag.reason = reason;
    existingFlag.metrics = metrics;
    existingFlag.user = user || existingFlag.user;
    existingFlag.secondaryUser = secondaryUser || existingFlag.secondaryUser;
    existingFlag.task = task || existingFlag.task;
    existingFlag.walletTransaction = walletTransaction || existingFlag.walletTransaction;
    existingFlag.lastDetectedAt = new Date();
    existingFlag.occurrenceCount += 1;

    await existingFlag.save();
    return existingFlag;
  }

  return FraudFlag.create({
    fingerprint,
    flagType,
    severity,
    title,
    reason,
    metrics,
    user,
    secondaryUser,
    task,
    walletTransaction,
    lastDetectedAt: new Date(),
  });
};

const detectRepeatedCancellation = async (task) => {
  const requesterId = task.requestedBy?._id || task.requestedBy;
  if (!requesterId || task.status !== "cancelled") {
    return null;
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cancellationCount = await Task.countDocuments({
    requestedBy: requesterId,
    status: "cancelled",
    cancelledAt: { $gte: since },
  });

  if (cancellationCount < 3) {
    return null;
  }

  return recordFraudFlag({
    fingerprint: `repeated_cancellations:user:${requesterId}`,
    flagType: "repeated_cancellations",
    severity: cancellationCount >= 5 ? "high" : "medium",
    title: "Repeated task cancellations detected",
    reason: `Requester cancelled ${cancellationCount} tasks within the last 30 days.`,
    metrics: {
      cancellationCount,
      lookbackDays: 30,
    },
    user: requesterId,
    task: task._id,
  });
};

const detectFastCompletion = async (task) => {
  if (!task.acceptedAt || !task.completedAt || task.status !== "completed") {
    return null;
  }

  const elapsedMs = task.completedAt.getTime() - task.acceptedAt.getTime();
  const elapsedMinutes = elapsedMs / 60000;

  if (elapsedMinutes > 5) {
    return null;
  }

  const runnerId = task.assignedRunner?._id || task.assignedRunner;
  const requesterId = task.requestedBy?._id || task.requestedBy;

  return recordFraudFlag({
    fingerprint: `unusually_fast_completion:task:${task._id}`,
    flagType: "unusually_fast_completion",
    severity: elapsedMinutes <= 1 ? "high" : "medium",
    title: "Unusually fast task completion detected",
    reason: `Task completed ${elapsedMinutes.toFixed(2)} minutes after acceptance.`,
    metrics: {
      elapsedMinutes: Number(elapsedMinutes.toFixed(2)),
      acceptedAt: task.acceptedAt,
      completedAt: task.completedAt,
    },
    user: runnerId,
    secondaryUser: requesterId,
    task: task._id,
  });
};

const detectSelfDealingPattern = async (task) => {
  const requesterId = task.requestedBy?._id || task.requestedBy;
  const runnerId = task.assignedRunner?._id || task.assignedRunner;

  if (!requesterId || !runnerId || task.status !== "completed") {
    return null;
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const pairCompletionCount = await Task.countDocuments({
    requestedBy: requesterId,
    assignedRunner: runnerId,
    status: "completed",
    completedAt: { $gte: since },
  });

  if (pairCompletionCount < 3) {
    return null;
  }

  return recordFraudFlag({
    fingerprint: `self_dealing_pattern:${requesterId}:${runnerId}`,
    flagType: "self_dealing_pattern",
    severity: pairCompletionCount >= 5 ? "high" : "medium",
    title: "Repeated requester-runner pair activity detected",
    reason: `The same requester and runner completed ${pairCompletionCount} tasks together within the last 30 days.`,
    metrics: {
      pairCompletionCount,
      lookbackDays: 30,
    },
    user: requesterId,
    secondaryUser: runnerId,
    task: task._id,
  });
};

const detectWalletAbuse = async (transaction) => {
  if (transaction.status !== "failed" || transaction.type !== "debit") {
    return null;
  }

  const userId = transaction.user?._id || transaction.user;
  if (!userId) {
    return null;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const failedDebitCount = await WalletTransaction.countDocuments({
    user: userId,
    type: "debit",
    status: "failed",
    updatedAt: { $gte: since },
  });

  if (failedDebitCount < 3) {
    return null;
  }

  return recordFraudFlag({
    fingerprint: `wallet_abuse:user:${userId}`,
    flagType: "wallet_abuse",
    severity: failedDebitCount >= 5 ? "high" : "medium",
    title: "Repeated failed wallet debits detected",
    reason: `User accumulated ${failedDebitCount} failed debit transactions within the last 7 days.`,
    metrics: {
      failedDebitCount,
      lookbackDays: 7,
    },
    user: userId,
    walletTransaction: transaction._id,
  });
};

const evaluateTaskForFraudFlags = async (task, eventType) => {
  if (eventType === "cancelled") {
    await detectRepeatedCancellation(task);
    return;
  }

  if (eventType === "completed") {
    await Promise.all([detectFastCompletion(task), detectSelfDealingPattern(task)]);
  }
};

const evaluateWalletTransactionForFraudFlags = async (transaction) => {
  await detectWalletAbuse(transaction);
};

export { evaluateTaskForFraudFlags, evaluateWalletTransactionForFraudFlags };