import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const allowedRoles = ["requester", "runner", "admin"];
const allowedCooldownActions = [
  "task_creation",
  "task_cancellation",
  "task_acceptance",
  "wallet_withdrawal",
];
const allowedCooldownSourceTypes = [
  "admin",
  "repeated_cancellations",
  "wallet_abuse",
  "unusually_fast_completion",
  "self_dealing_pattern",
];

const campusScopeSchema = new mongoose.Schema(
  {
    campusId: {
      type: String,
      trim: true,
      default: "",
    },
    campusName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const cooldownSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: allowedCooldownActions,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    sourceType: {
      type: String,
      enum: allowedCooldownSourceTypes,
      required: true,
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
    clearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    clearReason: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: true },
);
const generateInviteCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      default: generateInviteCode,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    campusId: {
      type: String,
      trim: true,
      default: "",
    },
    campusName: {
      type: String,
      trim: true,
      default: "",
    },
    campusScopes: {
      type: [campusScopeSchema],
      default: [],
    },
    role: {
      type: String,
      enum: allowedRoles,
      default: "requester",
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: "",
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cooldowns: {
      type: [cooldownSchema],
      default: [],
    restoredAt: {
      type: Date,
      default: null,
    },
    restoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    restoreReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function save() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function isPasswordCorrect(
  password,
) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function generateAccessToken(options = {}) {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      sid: options.sessionId || undefined,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    },
  );
};

userSchema.methods.generateRefreshToken = function generateRefreshToken(options = {}) {
  return jwt.sign(
    {
      _id: this._id,
      sid: options.sessionId || undefined,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d",
    },
  );
};

const User = mongoose.model("User", userSchema);

export { User, allowedCooldownActions, allowedCooldownSourceTypes, allowedRoles };