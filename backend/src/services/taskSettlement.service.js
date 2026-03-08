import { Task } from "../models/task.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";

const buildSettlementReference = (taskId) => `TASK-SETTLEMENT-${taskId}`;

const settleRunnerEarningsForTask = async ({ taskId, initiatedBy }) => {
  const task = await Task.findById(taskId).populate("assignedRunner", "_id");

  if (!task) {
    throw new ApiError(404, "Task not found for settlement");
  }

  if (task.status !== "completed") {
    throw new ApiError(409, "Only completed tasks can be settled");
  }

  if (!task.assignedRunner) {
    throw new ApiError(409, "Completed task has no assigned runner for settlement");
  }

  if (task.settlementStatus === "settled" && task.settlementTransaction) {
    const existingTransaction = await WalletTransaction.findById(task.settlementTransaction);

    return {
      task,
      transaction: existingTransaction,
      created: false,
    };
  }

  if (task.reward <= 0) {
    task.settlementStatus = "not_required";
    task.settlementAmount = 0;
    task.settlementReference = "";
    task.settlementTransaction = null;
    task.settledAt = task.settledAt || new Date();
    await task.save();

    return {
      task,
      transaction: null,
      created: false,
    };
  }

  const settlementReference = buildSettlementReference(task._id);
  const settlementPayload = {
    user: task.assignedRunner._id,
    type: "credit",
    amount: task.reward,
    status: "completed",
    description: `Automatic payout for completed task: ${task.title}`,
    reference: settlementReference,
    sourceTask: task._id,
    initiatedBy: initiatedBy || task.assignedRunner._id,
    failureReason: "",
  };

  let transaction = await WalletTransaction.findOne({
    sourceTask: task._id,
    type: "credit",
  });
  let created = false;

  if (!transaction) {
    try {
      transaction = await WalletTransaction.findOneAndUpdate(
        {
          sourceTask: task._id,
          type: "credit",
        },
        {
          $setOnInsert: settlementPayload,
        },
        {
          upsert: true,
          returnDocument: "after",
        },
      );
      created = true;
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      transaction = await WalletTransaction.findOne({
        sourceTask: task._id,
        type: "credit",
      });
    }
  }

  task.settlementStatus = "settled";
  task.settlementAmount = task.reward;
  task.settlementReference = settlementReference;
  task.settlementTransaction = transaction?._id || null;
  task.settledAt = task.settledAt || transaction?.createdAt || new Date();

  await task.save();

  return {
    task,
    transaction,
    created,
  };
};

export { buildSettlementReference, settleRunnerEarningsForTask };