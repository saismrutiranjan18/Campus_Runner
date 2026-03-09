import mongoose from "mongoose";

const maintenanceFeatureGateSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    updatedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

const maintenanceSettingSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },
    registration: {
      type: maintenanceFeatureGateSchema,
      default: () => ({}),
    },
    taskCreation: {
      type: maintenanceFeatureGateSchema,
      default: () => ({}),
    },
    walletMutations: {
      type: maintenanceFeatureGateSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

const MaintenanceSetting = mongoose.model("MaintenanceSetting", maintenanceSettingSchema);

export { MaintenanceSetting };