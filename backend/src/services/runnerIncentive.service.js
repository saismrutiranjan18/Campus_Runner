import mongoose from "mongoose";

import { RunnerIncentiveRule } from "../models/runnerIncentiveRule.model.js";
import { Task } from "../models/task.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";

const roundToTwoDecimals = (value) => {
  return Math.round(value * 100) / 100;
};

const normalizeCampusZones = (campusZones = []) => {
  return [...new Set(campusZones.map((zone) => String(zone || "").trim()).filter(Boolean))];
};

const buildWeeklyWindow = (referenceDate = new Date()) => {
  const normalizedReferenceDate = new Date(referenceDate);
  if (Number.isNaN(normalizedReferenceDate.getTime())) {
    throw new ApiError(400, "Invalid incentive evaluation reference date provided");
  }

  const dayOfWeek = normalizedReferenceDate.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const windowStart = new Date(
    Date.UTC(
      normalizedReferenceDate.getUTCFullYear(),
      normalizedReferenceDate.getUTCMonth(),
      normalizedReferenceDate.getUTCDate(),
    ),
  );
  windowStart.setUTCDate(windowStart.getUTCDate() - daysSinceMonday);

  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);

  return {
    windowStart,
    windowEnd,
  };
};

const resolveEvaluationWindow = ({ windowStart, windowEnd, referenceDate } = {}) => {
  if (!windowStart && !windowEnd) {
    return buildWeeklyWindow(referenceDate);
  }

  const resolvedWindowStart = new Date(windowStart);
  const resolvedWindowEnd = new Date(windowEnd);

  if (
    Number.isNaN(resolvedWindowStart.getTime()) ||
    Number.isNaN(resolvedWindowEnd.getTime())
  ) {
    throw new ApiError(400, "Invalid incentive evaluation window provided");
  }

  if (resolvedWindowStart >= resolvedWindowEnd) {
    throw new ApiError(400, "windowStart must be earlier than windowEnd");
  }

  return {
    windowStart: resolvedWindowStart,
    windowEnd: resolvedWindowEnd,
  };
};

const buildRunnerMetricsMapForWindow = async ({ windowStart, windowEnd }) => {
  const tasks = await Task.find({
    assignedRunner: { $ne: null },
    $or: [
      {
        status: "completed",
        completedAt: { $gte: windowStart, $lt: windowEnd },
      },
      {
        status: "cancelled",
        cancelledAt: { $gte: windowStart, $lt: windowEnd },
      },
    ],
  })
    .select("assignedRunner status campus campusZone completedAt cancelledAt")
    .lean();

  const metricsByRunnerId = new Map();

  for (const task of tasks) {
    const runnerId = String(task.assignedRunner);
    const metrics = metricsByRunnerId.get(runnerId) || {
      completedTaskCount: 0,
      cancelledTaskCount: 0,
      totalResolvedTaskCount: 0,
      completionRate: 0,
      zoneCounts: new Map(),
    };

    if (task.status === "completed") {
      metrics.completedTaskCount += 1;

      const zoneValue = String(task.campusZone || task.campus || "").trim();
      if (zoneValue) {
        metrics.zoneCounts.set(zoneValue, (metrics.zoneCounts.get(zoneValue) || 0) + 1);
      }
    }

    if (task.status === "cancelled") {
      metrics.cancelledTaskCount += 1;
    }

    metrics.totalResolvedTaskCount =
      metrics.completedTaskCount + metrics.cancelledTaskCount;
    metrics.completionRate =
      metrics.totalResolvedTaskCount === 0
        ? 0
        : roundToTwoDecimals(
            (metrics.completedTaskCount / metrics.totalResolvedTaskCount) * 100,
          );

    metricsByRunnerId.set(runnerId, metrics);
  }

  return metricsByRunnerId;
};

const buildRuleWindowReference = (ruleCode, runnerId, windowStart) => {
  return `RUNNER-INCENTIVE-${ruleCode}-${runnerId}-${windowStart.toISOString().slice(0, 10)}`;
};

const evaluateRuleForRunner = (rule, metrics) => {
  const normalizedCampusZones = normalizeCampusZones(rule.campusZones);
  const highDemandZoneTaskCount = normalizedCampusZones.reduce((total, zone) => {
    return total + (metrics.zoneCounts.get(zone) || 0);
  }, 0);

  const evaluationSnapshot = {
    completedTaskCount: metrics.completedTaskCount,
    cancelledTaskCount: metrics.cancelledTaskCount,
    totalResolvedTaskCount: metrics.totalResolvedTaskCount,
    completionRate: metrics.completionRate,
    highDemandZoneTaskCount,
    campusZones: normalizedCampusZones,
  };

  if (rule.type === "task_count") {
    return {
      eligible: metrics.completedTaskCount >= rule.minimumCompletedTasks,
      evaluationSnapshot,
    };
  }

  if (rule.type === "completion_rate") {
    return {
      eligible:
        metrics.totalResolvedTaskCount > 0 &&
        metrics.completedTaskCount >= rule.minimumCompletedTasks &&
        metrics.completionRate >= rule.minimumCompletionRate,
      evaluationSnapshot,
    };
  }

  return {
    eligible:
      normalizedCampusZones.length > 0 &&
      highDemandZoneTaskCount >= rule.minimumCompletedTasks,
    evaluationSnapshot,
  };
};

const payoutProjection = "fullName email phoneNumber role isVerified isActive";

const evaluateRunnerIncentives = async ({
  initiatedBy,
  ruleIds,
  windowStart,
  windowEnd,
  previewOnly = false,
  referenceDate,
} = {}) => {
  const evaluationWindow = resolveEvaluationWindow({
    windowStart,
    windowEnd,
    referenceDate,
  });

  const filters = { isActive: true };
  if (ruleIds?.length) {
    filters._id = {
      $in: ruleIds.map((ruleId) => new mongoose.Types.ObjectId(ruleId)),
    };
  }

  const rules = await RunnerIncentiveRule.find(filters).sort({ createdAt: -1 });
  if (rules.length === 0) {
    return {
      window: evaluationWindow,
      summary: {
        totalRules: 0,
        eligiblePayoutCount: 0,
        createdPayoutCount: 0,
        skippedExistingPayoutCount: 0,
        totalPayoutAmount: 0,
      },
      items: [],
    };
  }

  const metricsByRunnerId = await buildRunnerMetricsMapForWindow(evaluationWindow);
  const items = [];
  let eligiblePayoutCount = 0;
  let createdPayoutCount = 0;
  let skippedExistingPayoutCount = 0;
  let totalPayoutAmount = 0;

  for (const [runnerId, metrics] of metricsByRunnerId.entries()) {
    for (const rule of rules) {
      const evaluation = evaluateRuleForRunner(rule, metrics);
      if (!evaluation.eligible) {
        continue;
      }

      eligiblePayoutCount += 1;

      const baseItem = {
        runnerId,
        rule,
        rewardAmount: rule.rewardAmount,
        status: previewOnly ? "preview" : "skipped_existing",
        reference: buildRuleWindowReference(rule.code, runnerId, evaluationWindow.windowStart),
        evaluationSnapshot: evaluation.evaluationSnapshot,
      };

      if (previewOnly) {
        totalPayoutAmount += rule.rewardAmount;
        items.push(baseItem);
        continue;
      }

      let transaction = await WalletTransaction.findOne({
        user: runnerId,
        category: "runner_incentive",
        incentiveRule: rule._id,
        incentiveWindowStart: evaluationWindow.windowStart,
        incentiveWindowEnd: evaluationWindow.windowEnd,
      })
        .populate("user", payoutProjection)
        .populate("initiatedBy", payoutProjection)
        .populate("reviewedBy", payoutProjection)
        .populate("incentiveRule", "code name type rewardAmount isActive");

      if (!transaction) {
        try {
          transaction = await WalletTransaction.findOneAndUpdate(
            {
              user: runnerId,
              category: "runner_incentive",
              incentiveRule: rule._id,
              incentiveWindowStart: evaluationWindow.windowStart,
              incentiveWindowEnd: evaluationWindow.windowEnd,
            },
            {
              $setOnInsert: {
                user: runnerId,
                type: "credit",
                amount: rule.rewardAmount,
                status: "completed",
                category: "runner_incentive",
                description: `Runner incentive payout: ${rule.name}`,
                reference: baseItem.reference,
                sourceTask: null,
                incentiveRule: rule._id,
                incentiveWindowStart: evaluationWindow.windowStart,
                incentiveWindowEnd: evaluationWindow.windowEnd,
                incentiveMetrics: evaluation.evaluationSnapshot,
                initiatedBy: initiatedBy || null,
                failureReason: "",
              },
            },
            {
              upsert: true,
              returnDocument: "after",
            },
          )
            .populate("user", payoutProjection)
            .populate("initiatedBy", payoutProjection)
            .populate("reviewedBy", payoutProjection)
            .populate("incentiveRule", "code name type rewardAmount isActive");
          createdPayoutCount += 1;
          totalPayoutAmount += rule.rewardAmount;
          items.push({
            ...baseItem,
            status: "created",
            transaction,
          });
          continue;
        } catch (error) {
          if (error?.code !== 11000) {
            throw error;
          }

          transaction = await WalletTransaction.findOne({
            user: runnerId,
            category: "runner_incentive",
            incentiveRule: rule._id,
            incentiveWindowStart: evaluationWindow.windowStart,
            incentiveWindowEnd: evaluationWindow.windowEnd,
          })
            .populate("user", payoutProjection)
            .populate("initiatedBy", payoutProjection)
            .populate("reviewedBy", payoutProjection)
            .populate("incentiveRule", "code name type rewardAmount isActive");
        }
      }

      skippedExistingPayoutCount += 1;
      totalPayoutAmount += rule.rewardAmount;
      items.push({
        ...baseItem,
        status: "skipped_existing",
        transaction,
      });
    }
  }

  return {
    window: evaluationWindow,
    summary: {
      totalRules: rules.length,
      eligiblePayoutCount,
      createdPayoutCount,
      skippedExistingPayoutCount,
      totalPayoutAmount: roundToTwoDecimals(totalPayoutAmount),
    },
    items,
  };
};

export {
  buildWeeklyWindow,
  evaluateRunnerIncentives,
  normalizeCampusZones,
  resolveEvaluationWindow,
};