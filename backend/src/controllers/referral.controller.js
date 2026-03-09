import { Referral } from "../models/referral.model.js";
import {
  createReferralAttribution,
  getReferralSummaryForUser,
  REFERRAL_ACCOUNT_CLAIM_WINDOW_DAYS,
} from "../services/referral.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sanitizeReferralUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    inviteCode: user.inviteCode,
  };
};

const sanitizeRewardTransaction = (transaction) => {
  if (!transaction) {
    return null;
  }

  return {
    id: transaction._id,
    amount: transaction.amount,
    status: transaction.status,
    category: transaction.category,
    reference: transaction.reference,
    createdAt: transaction.createdAt,
  };
};

const sanitizeReferral = (referral) => {
  if (!referral) {
    return null;
  }

  return {
    id: referral._id,
    inviteCode: referral.inviteCode,
    status: referral.status,
    attributionSource: referral.attributionSource,
    rewardRule: referral.rewardRule,
    attributedAt: referral.attributedAt,
    rewardedAt: referral.rewardedAt,
    blockedAt: referral.blockedAt,
    blockedReason: referral.blockedReason,
    inviter: sanitizeReferralUser(referral.inviter),
    invitee: sanitizeReferralUser(referral.invitee),
    qualificationTaskId:
      referral.qualificationTask?._id || referral.qualificationTask || null,
    inviterRewardAmount: referral.inviterRewardAmount,
    inviteeRewardAmount: referral.inviteeRewardAmount,
    inviterRewardTransaction: sanitizeRewardTransaction(referral.inviterRewardTransaction),
    inviteeRewardTransaction: sanitizeRewardTransaction(referral.inviteeRewardTransaction),
    metadata: referral.metadata || {},
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
  };
};

const getMyReferralSummary = asyncHandler(async (req, res) => {
  const summary = await getReferralSummaryForUser(req.user._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        inviteCode: summary.inviteCode,
        claimWindowDays: REFERRAL_ACCOUNT_CLAIM_WINDOW_DAYS,
        rewards: summary.rewards,
        referralsSent: summary.referralsSent.map(sanitizeReferral),
        referralReceived: sanitizeReferral(summary.referralReceived),
      },
      "Referral summary fetched successfully",
    ),
  );
});

const claimReferralCode = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  const referral = await createReferralAttribution({
    inviteCode,
    inviteeId: req.user._id,
    attributionSource: "claim",
  });

  res.status(201).json(
    new ApiResponse(201, sanitizeReferral(referral), "Referral code claimed successfully"),
  );
});

const getReferralByInviteeId = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ invitee: req.params.userId }).populate([
    {
      path: "inviter",
      select: "fullName email phoneNumber role isVerified isActive inviteCode",
    },
    {
      path: "invitee",
      select: "fullName email phoneNumber role isVerified isActive inviteCode",
    },
    {
      path: "inviterRewardTransaction",
      select: "amount status category reference createdAt",
    },
    {
      path: "inviteeRewardTransaction",
      select: "amount status category reference createdAt",
    },
  ]);

  res.status(200).json(
    new ApiResponse(200, sanitizeReferral(referral), "Referral fetched successfully"),
  );
});

export { claimReferralCode, getMyReferralSummary, getReferralByInviteeId, sanitizeReferral };