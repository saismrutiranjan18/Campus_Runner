import mongoose from "mongoose";

import { allowedTransportModes } from "./task.model.js";

const transportRulesSchema = new mongoose.Schema(
  {
    allowedTransportModes: {
      type: [
        {
          type: String,
          enum: allowedTransportModes,
        },
      ],
      default: ["walk", "bike", "car", "public_transport", "other"],
    },
    defaultTransportMode: {
      type: String,
      enum: allowedTransportModes,
      default: "other",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const operationalSettingsSchema = new mongoose.Schema(
  {
    isTaskCreationEnabled: {
      type: Boolean,
      default: true,
    },
    isRunnerAcceptanceEnabled: {
      type: Boolean,
      default: true,
    },
    assignmentExpiryMinutes: {
      type: Number,
      min: 5,
      max: 180,
      default: 15,
    },
    minTaskReward: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxTaskReward: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: false },
);

const campusMetadataSchema = new mongoose.Schema(
  {
    shortCode: {
      type: String,
      trim: true,
      default: "",
    },
    timezone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const campusConfigSchema = new mongoose.Schema(
  {
    campusId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    campusName: {
      type: String,
      required: true,
      trim: true,
    },
    campusNameNormalized: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    metadata: {
      type: campusMetadataSchema,
      default: () => ({}),
    },
    transportRules: {
      type: transportRulesSchema,
      default: () => ({}),
    },
    operationalSettings: {
      type: operationalSettingsSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

campusConfigSchema.pre("validate", function setNormalizedFields(next) {
  this.campusId = String(this.campusId || "").trim().toLowerCase();
  this.campusName = String(this.campusName || "").trim();
  this.campusNameNormalized = this.campusName.toLowerCase();

  if (this.transportRules?.allowedTransportModes?.length) {
    this.transportRules.allowedTransportModes = [
      ...new Set(this.transportRules.allowedTransportModes.map((mode) => String(mode).trim())),
    ];
  }

  next();
});

campusConfigSchema.index({ isActive: 1, campusName: 1 });

const CampusConfig = mongoose.model("CampusConfig", campusConfigSchema);

export { CampusConfig };