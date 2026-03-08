import { Referral } from "../models/referral.model.js";
import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";

const REFERRAL_ACCOUNT_CLAIM_WINDOW_DAYS = 7;
const INVITER_REWARD_AMOUNT = 75;
const INVITEE_REWARD_AMOUNT = 25;

const referralPopulate = [
  {
    path: "inviter",
    select: "fullName email phoneNumber role isVerified isActive inviteCode",
  },
  {
    path: "invitee",
    select: "fullName email phoneNumber role isVerified isActive inviteCode",
  },
  {
    path: "qualificationTask",
    select: "title status reward requestedBy assignedRunner completedAt",
  },
  {
    path: "inviterRewardTransaction",
    select: "amount status category reference createdAt",
  },
  {
    path: "inviteeRewardTransaction",
    select: "amount status category reference createdAt",
  },
];

const getReferralClaimDeadline = (createdAt) => {
  return new Date(createdAt.getTime() + REFERRAL_ACCOUNT_CLAIM_WINDOW_DAYS * 24 * 60 * 60 * 1000);
};

const sanitizePhoneNumber = (phoneNumber) => {
  return (phoneNumber || "").replace(/[^0-9+]/g, "").trim();
};

const ensureInviterAllowed = (inviter) => {
  if (!inviter) {
    throw new ApiError(404, "Invite code not found");
  }

  if (!inviter.isActive) {
    throw new ApiError(403, "Invite code belongs to an inactive account");
  }

  if (inviter.role === "admin") {
    throw new ApiError(403, "Admin invite codes cannot be used for referrals");
  }
};

const ensureInviteeAllowed = async (invitee) => {
  const existingReferral = await Referral.findOne({ invitee: invitee._id });
  if (existingReferral) {
    throw new ApiError(409, "Referral has already been attributed to this account");
  }

  if (invitee.role === "admin") {
    throw new ApiError(403, "Admin accounts cannot use referral invites");
  }

  if (!invitee.isActive) {
    throw new ApiError(403, "Inactive accounts cannot use referral invites");
  }
};

const ensureNotSelfReferral = (inviter, invitee) => {
  if (String(inviter._id) === String(invitee._id)) {
    throw new ApiError(400, "Users cannot refer themselves");
  }

  if (inviter.email && invitee.email && inviter.email === invitee.email) {
    throw new ApiError(400, "Users cannot refer themselves");
  }

  const inviterPhone = sanitizePhoneNumber(inviter.phoneNumber);
  const inviteePhone = sanitizePhoneNumber(invitee.phoneNumber);
  if (inviterPhone && inviteePhone && inviterPhone === inviteePhone) {
    throw new ApiError(400, "Referral blocked because both accounts share the same phone number");
  }
};

const assertInviteeWithinClaimWindow = async (invitee) => {
  const claimDeadline = getReferralClaimDeadline(invitee.createdAt);
  if (claimDeadline < new Date()) {
    throw new ApiError(409, "Referral claim window has expired for this account");
  }

  const [taskCount, walletTransactionCount] = await Promise.all([
    Task.countDocuments({
      $or: [{ requestedBy: invitee._id }, { assignedRunner: invitee._id }],
    }),
    WalletTransaction.countDocuments({ user: invitee._id }),
  ]);

  if (taskCount > 0 || walletTransactionCount > 0) {
    throw new ApiError(409, "Referral code must be claimed before the account starts platform activity");
  }
};

const createReferralAttribution = async ({ inviteCode, inviteeId, attributionSource }) => {
  const normalizedInviteCode = inviteCode?.trim().toUpperCase();
  if (!normalizedInviteCode) {
    throw new ApiError(400, "inviteCode is required");
  }

  const [inviter, invitee] = await Promise.all([
    User.findOne({ inviteCode: normalizedInviteCode }),
    User.findById(inviteeId),
  ]);

  ensureInviterAllowed(inviter);

  if (!invitee) {
    throw new ApiError(404, "Invitee account not found");
  }

  await ensureInviteeAllowed(invitee);
  ensureNotSelfReferral(inviter, invitee);

  if (attributionSource === "claim") {
    await assertInviteeWithinClaimWindow(invitee);
  }

  const referral = await Referral.create({
    inviter: inviter._id,
    invitee: invitee._id,
    inviteCode: normalizedInviteCode,
    attributionSource,
    metadata: {
      inviterCampusId: inviter.campusId || "",
      inviteeCampusId: invitee.campusId || "",
    },
  });

  return Referral.findById(referral._id).populate(referralPopulate);
};

const getReferralSummaryForUser = async (userId) => {
  const [user, referralsSent, referralReceived] = await Promise.all([
    User.findById(userId),
    Referral.find({ inviter: userId }).populate(referralPopulate).sort({ createdAt: -1 }),
    Referral.findOne({ invitee: userId }).populate(referralPopulate),
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    user,
    inviteCode: user.inviteCode,
    rewards: {
      sentCount: referralsSent.length,
      rewardedCount: referralsSent.filter((item) => item.status === "rewarded").length,
      totalInviterRewardAmount: referralsSent.reduce(
        (sum, item) => sum + (item.inviterRewardAmount || 0),
        0,
      ),
      totalInviteeRewardAmount: referralReceived?.inviteeRewardAmount || 0,
    },
    referralsSent,
    referralReceived,
  };
};

const awardReferralForUserIfEligible = async ({ inviteeId, taskId, initiatedBy }) => {
  const referral = await Referral.findOne({
    invitee: inviteeId,
    status: "attributed",
  });

  if (!referral) {
    return null;
  }

  const qualifyingTaskCount = await Task.countDocuments({
    status: "completed",
    $or: [{ requestedBy: inviteeId }, { assignedRunner: inviteeId }],
  });

  if (qualifyingTaskCount !== 1) {
    return null;
  }

  const inviterReference = `REFERRAL-INVITER-${referral._id}`;
  const inviteeReference = `REFERRAL-INVITEE-${referral._id}`;

  const existingTransactions = await WalletTransaction.find({
    reference: { $in: [inviterReference, inviteeReference] },
  }).lean();

  if (existingTransactions.length > 0) {
    return Referral.findById(referral._id).populate(referralPopulate);
  }

  const [inviterTransaction, inviteeTransaction] = await WalletTransaction.create([
    {
      user: referral.inviter,
      type: "credit",
      amount: INVITER_REWARD_AMOUNT,
      status: "completed",
      category: "referral_reward",
      description: "Referral reward for inviting an active user",
      reference: inviterReference,
      initiatedBy: initiatedBy || referral.inviter,
      failureReason: "",
    },
    {
      user: referral.invitee,
      type: "credit",
      amount: INVITEE_REWARD_AMOUNT,
      status: "completed",
      category: "referral_reward",
      description: "Referral reward for completing your first task via invite",
      reference: inviteeReference,
      initiatedBy: initiatedBy || referral.invitee,
      failureReason: "",
    },
  ]);

  referral.status = "rewarded";
  referral.rewardedAt = new Date();
  referral.qualificationTask = taskId;
  referral.inviterRewardAmount = INVITER_REWARD_AMOUNT;
  referral.inviteeRewardAmount = INVITEE_REWARD_AMOUNT;
  referral.inviterRewardTransaction = inviterTransaction._id;
  referral.inviteeRewardTransaction = inviteeTransaction._id;

  await referral.save();

  return Referral.findById(referral._id).populate(referralPopulate);
};

export {
  createReferralAttribution,
  getReferralSummaryForUser,
  REFERRAL_ACCOUNT_CLAIM_WINDOW_DAYS,
  INVITER_REWARD_AMOUNT,
  INVITEE_REWARD_AMOUNT,
  referralPopulate,
  awardReferralForUserIfEligible,
};