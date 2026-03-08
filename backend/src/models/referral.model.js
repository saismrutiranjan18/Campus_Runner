import mongoose from "mongoose";

const allowedReferralStatuses = ["attributed", "rewarded", "blocked"];
const allowedReferralSources = ["register", "claim"];

const referralSchema = new mongoose.Schema(
  {
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: allowedReferralStatuses,
      default: "attributed",
      index: true,
    },
    attributionSource: {
      type: String,
      enum: allowedReferralSources,
      required: true,
    },
    attributedAt: {
      type: Date,
      default: Date.now,
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      trim: true,
      default: "",
    },
    rewardRule: {
      type: String,
      trim: true,
      default: "first_completed_task",
    },
    qualificationTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    inviterRewardAmount: {
      type: Number,
      default: 0,
    },
    inviteeRewardAmount: {
      type: Number,
      default: 0,
    },
    inviterRewardTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    inviteeRewardTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

referralSchema.index({ inviter: 1, createdAt: -1 });
referralSchema.index({ status: 1, createdAt: -1 });

const Referral = mongoose.model("Referral", referralSchema);

export { Referral, allowedReferralSources, allowedReferralStatuses };