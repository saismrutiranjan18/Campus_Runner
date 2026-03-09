import mongoose from "mongoose";

const allowedRunnerIncentiveRuleTypes = ["task_count", "completion_rate", "campus_zone"];

const runnerIncentiveRuleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: allowedRunnerIncentiveRuleTypes,
      required: true,
      index: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    minimumCompletedTasks: {
      type: Number,
      min: 0,
      default: 0,
    },
    minimumCompletionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    campusZones: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

runnerIncentiveRuleSchema.index({ isActive: 1, type: 1, createdAt: -1 });

const RunnerIncentiveRule = mongoose.model(
  "RunnerIncentiveRule",
  runnerIncentiveRuleSchema,
);

export { RunnerIncentiveRule, allowedRunnerIncentiveRuleTypes };