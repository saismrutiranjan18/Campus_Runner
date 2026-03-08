import { Task } from "../models/task.model.js";

const DEFAULT_TASK_ACCEPTANCE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_TASK_EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

const parsePositiveMilliseconds = (value, fallbackValue) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
};

const getTaskAcceptanceTimeoutMs = () => {
  return parsePositiveMilliseconds(
    process.env.TASK_ACCEPTANCE_TIMEOUT_MS,
    DEFAULT_TASK_ACCEPTANCE_TIMEOUT_MS,
  );
};

const getTaskExpiryCheckIntervalMs = () => {
  return parsePositiveMilliseconds(
    process.env.TASK_EXPIRY_CHECK_INTERVAL_MS,
    DEFAULT_TASK_EXPIRY_CHECK_INTERVAL_MS,
  );
};

const calculateAssignmentExpiryDate = (
  acceptedAt = new Date(),
  acceptanceTimeoutMs = getTaskAcceptanceTimeoutMs(),
) => {
  return new Date(acceptedAt.getTime() + acceptanceTimeoutMs);
};

const reopenExpiredAcceptedTasks = async ({
  now = new Date(),
  acceptanceTimeoutMs = getTaskAcceptanceTimeoutMs(),
} = {}) => {
  const checkedAt = now instanceof Date ? now : new Date(now);
  const timeoutCutoff = new Date(checkedAt.getTime() - acceptanceTimeoutMs);
  const expirationReason = `Task acceptance expired after ${acceptanceTimeoutMs}ms`;

  const result = await Task.updateMany(
    {
      status: "accepted",
      isArchived: false,
      startedAt: null,
      acceptedAt: { $ne: null },
      $or: [
        { assignmentExpiresAt: { $lte: checkedAt } },
        {
          assignmentExpiresAt: null,
          acceptedAt: { $lte: timeoutCutoff },
        },
      ],
    },
    {
      $set: {
        status: "open",
        assignedRunner: null,
        acceptedAt: null,
        assignmentExpiresAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: "",
        lastExpiredAt: checkedAt,
        reopenedAt: checkedAt,
        expirationReason,
      },
      $inc: {
        expiryReopenCount: 1,
      },
    },
  );

  return {
    checkedAt,
    acceptanceTimeoutMs,
    reopenedCount: result.modifiedCount ?? 0,
  };
};

const startTaskExpiryMonitor = ({
  acceptanceTimeoutMs = getTaskAcceptanceTimeoutMs(),
  intervalMs = getTaskExpiryCheckIntervalMs(),
  logger = console,
} = {}) => {
  let isRunning = false;

  const runIteration = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      const result = await reopenExpiredAcceptedTasks({ acceptanceTimeoutMs });

      if (result.reopenedCount > 0) {
        logger.log(`Auto-reopened ${result.reopenedCount} expired accepted task(s).`);
      }
    } catch (error) {
      logger.error("Task expiry monitor failed", error);
    } finally {
      isRunning = false;
    }
  };

  const timer = setInterval(() => {
    void runIteration();
  }, intervalMs);

  timer.unref?.();
  void runIteration();

  return () => clearInterval(timer);
};

export {
  calculateAssignmentExpiryDate,
  getTaskAcceptanceTimeoutMs,
  getTaskExpiryCheckIntervalMs,
  reopenExpiredAcceptedTasks,
  startTaskExpiryMonitor,
};
