import { Task } from "../models/task.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";

const roundToTwoDecimals = (value) => {
  return Math.round(value * 100) / 100;
};

const calculateAverageCompletionTimeMinutes = (tasks) => {
  const completedDurations = tasks
    .filter((task) => task.status === "completed" && task.acceptedAt && task.completedAt)
    .map((task) => task.completedAt.getTime() - task.acceptedAt.getTime())
    .filter((duration) => duration >= 0);

  if (completedDurations.length === 0) {
    return 0;
  }

  const totalDuration = completedDurations.reduce((sum, duration) => sum + duration, 0);
  return roundToTwoDecimals(totalDuration / completedDurations.length / 60000);
};

const buildRunnerMetricsMap = async (runnerIds) => {
  if (runnerIds.length === 0) {
    return new Map();
  }

  const [tasks, earningsRows] = await Promise.all([
    Task.find({ assignedRunner: { $in: runnerIds } })
      .select("assignedRunner status acceptedAt completedAt")
      .lean(),
    WalletTransaction.aggregate([
      {
        $match: {
          user: { $in: runnerIds },
          type: "credit",
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$user",
          totalEarnings: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const tasksByRunnerId = new Map();
  for (const task of tasks) {
    const runnerId = String(task.assignedRunner);
    const existingTasks = tasksByRunnerId.get(runnerId) || [];
    existingTasks.push(task);
    tasksByRunnerId.set(runnerId, existingTasks);
  }

  const earningsByRunnerId = new Map(
    earningsRows.map((row) => [String(row._id), row.totalEarnings]),
  );

  const metricsByRunnerId = new Map();
  for (const runnerId of runnerIds.map(String)) {
    const runnerTasks = tasksByRunnerId.get(runnerId) || [];
    const acceptedTaskCount = runnerTasks.length;
    const activeTaskCount = runnerTasks.filter((task) =>
      ["accepted", "in_progress"].includes(task.status),
    ).length;
    const completedTaskCount = runnerTasks.filter((task) => task.status === "completed").length;
    const cancelledTaskCount = runnerTasks.filter((task) => task.status === "cancelled").length;

    const completionRate =
      acceptedTaskCount === 0
        ? 0
        : roundToTwoDecimals((completedTaskCount / acceptedTaskCount) * 100);
    const cancellationRate =
      acceptedTaskCount === 0
        ? 0
        : roundToTwoDecimals((cancelledTaskCount / acceptedTaskCount) * 100);
    const acceptanceRate =
      acceptedTaskCount === 0
        ? 0
        : roundToTwoDecimals(
            ((acceptedTaskCount - cancelledTaskCount) / acceptedTaskCount) * 100,
          );

    metricsByRunnerId.set(runnerId, {
      acceptedTaskCount,
      activeTaskCount,
      completedTaskCount,
      cancelledTaskCount,
      acceptanceRate,
      completionRate,
      cancellationRate,
      averageCompletionTimeMinutes: calculateAverageCompletionTimeMinutes(runnerTasks),
      totalEarnings: earningsByRunnerId.get(runnerId) || 0,
    });
  }

  return metricsByRunnerId;
};

const buildRunnerPerformanceEntry = (runner, metrics = {}) => {
  return {
    runner: {
      id: runner._id,
      fullName: runner.fullName,
      email: runner.email,
      phoneNumber: runner.phoneNumber,
      campusId: runner.campusId,
      campusName: runner.campusName,
      isVerified: runner.isVerified,
      isActive: runner.isActive,
      createdAt: runner.createdAt,
      updatedAt: runner.updatedAt,
    },
    metrics: {
      acceptedTaskCount: metrics.acceptedTaskCount || 0,
      activeTaskCount: metrics.activeTaskCount || 0,
      completedTaskCount: metrics.completedTaskCount || 0,
      cancelledTaskCount: metrics.cancelledTaskCount || 0,
      acceptanceRate: metrics.acceptanceRate || 0,
      completionRate: metrics.completionRate || 0,
      cancellationRate: metrics.cancellationRate || 0,
      averageCompletionTimeMinutes: metrics.averageCompletionTimeMinutes || 0,
      totalEarnings: metrics.totalEarnings || 0,
    },
  };
};

export { buildRunnerMetricsMap, buildRunnerPerformanceEntry };