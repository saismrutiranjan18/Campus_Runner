import { Promotion } from "../models/promotion.model.js";
import { PromotionRedemption } from "../models/promotionRedemption.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeCampusValue } from "../utils/campusScope.js";

const normalizePromotionCode = (code) => String(code || "").trim().toUpperCase();

const sanitizeCampusTargets = (targets = {}) => ({
  campusIds: [...new Set((targets.campusIds || []).map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))],
  campusNames: [...new Set((targets.campusNames || []).map((item) => String(item || "").trim()).filter(Boolean))],
});

const normalizePromotionPayload = (payload = {}, existingPromotion = null) => {
  const normalized = {
    code: normalizePromotionCode(payload.code ?? existingPromotion?.code),
    title: String(payload.title ?? existingPromotion?.title || "").trim(),
    description: String(payload.description ?? existingPromotion?.description || "").trim(),
    kind: String(payload.kind ?? existingPromotion?.kind || "").trim(),
    discountType: String(payload.discountType ?? existingPromotion?.discountType || "fixed").trim(),
    discountValue:
      payload.discountValue === undefined ? Number(existingPromotion?.discountValue || 0) : Number(payload.discountValue),
    maxDiscountAmount:
      payload.maxDiscountAmount === undefined
        ? existingPromotion?.maxDiscountAmount ?? null
        : payload.maxDiscountAmount === null || payload.maxDiscountAmount === ""
          ? null
          : Number(payload.maxDiscountAmount),
    walletCreditAmount:
      payload.walletCreditAmount === undefined
        ? Number(existingPromotion?.walletCreditAmount || 0)
        : Number(payload.walletCreditAmount),
    minimumTaskReward:
      payload.minimumTaskReward === undefined
        ? Number(existingPromotion?.minimumTaskReward || 0)
        : Number(payload.minimumTaskReward),
    campusTargets: sanitizeCampusTargets(payload.campusTargets ?? existingPromotion?.campusTargets ?? {}),
    oneTimePerUser:
      payload.oneTimePerUser === undefined ? Boolean(existingPromotion?.oneTimePerUser) : Boolean(payload.oneTimePerUser),
    maxTotalRedemptions:
      payload.maxTotalRedemptions === undefined
        ? existingPromotion?.maxTotalRedemptions ?? null
        : payload.maxTotalRedemptions === null || payload.maxTotalRedemptions === ""
          ? null
          : Number(payload.maxTotalRedemptions),
    validFrom:
      payload.validFrom === undefined || payload.validFrom === null || payload.validFrom === ""
        ? existingPromotion?.validFrom ?? null
        : new Date(payload.validFrom),
    validUntil:
      payload.validUntil === undefined || payload.validUntil === null || payload.validUntil === ""
        ? existingPromotion?.validUntil ?? null
        : new Date(payload.validUntil),
    isActive: payload.isActive === undefined ? existingPromotion?.isActive ?? true : Boolean(payload.isActive),
  };

  if (!normalized.code) {
    throw new ApiError(400, "code is required");
  }

  if (!normalized.title) {
    throw new ApiError(400, "title is required");
  }

  if (!["task_discount", "wallet_credit"].includes(normalized.kind)) {
    throw new ApiError(400, "Invalid promotion kind provided");
  }

  if (!["fixed", "percentage"].includes(normalized.discountType)) {
    throw new ApiError(400, "Invalid promotion discountType provided");
  }

  if (!Number.isFinite(normalized.discountValue) || normalized.discountValue < 0) {
    throw new ApiError(400, "discountValue must be a non-negative number");
  }

  if (normalized.maxDiscountAmount !== null && (!Number.isFinite(normalized.maxDiscountAmount) || normalized.maxDiscountAmount < 0)) {
    throw new ApiError(400, "maxDiscountAmount must be null or a non-negative number");
  }

  if (!Number.isFinite(normalized.walletCreditAmount) || normalized.walletCreditAmount < 0) {
    throw new ApiError(400, "walletCreditAmount must be a non-negative number");
  }

  if (!Number.isFinite(normalized.minimumTaskReward) || normalized.minimumTaskReward < 0) {
    throw new ApiError(400, "minimumTaskReward must be a non-negative number");
  }

  if (normalized.maxTotalRedemptions !== null && (!Number.isFinite(normalized.maxTotalRedemptions) || normalized.maxTotalRedemptions < 1)) {
    throw new ApiError(400, "maxTotalRedemptions must be null or at least 1");
  }

  if (normalized.validFrom && Number.isNaN(normalized.validFrom.getTime())) {
    throw new ApiError(400, "validFrom must be a valid date");
  }

  if (normalized.validUntil && Number.isNaN(normalized.validUntil.getTime())) {
    throw new ApiError(400, "validUntil must be a valid date");
  }

  if (normalized.validFrom && normalized.validUntil && normalized.validFrom > normalized.validUntil) {
    throw new ApiError(400, "validFrom cannot be later than validUntil");
  }

  if (normalized.kind === "task_discount") {
    if (normalized.discountType === "percentage" && normalized.discountValue > 100) {
      throw new ApiError(400, "percentage discountValue cannot exceed 100");
    }
  }

  if (normalized.kind === "wallet_credit" && normalized.walletCreditAmount <= 0) {
    throw new ApiError(400, "walletCreditAmount must be greater than zero for wallet_credit promotions");
  }

  return normalized;
};

const ensurePromotionActiveForUse = async ({ promotion, userId, campus }) => {
  if (!promotion || !promotion.isActive) {
    throw new ApiError(404, "Promotion not found or inactive");
  }

  const now = new Date();

  if (promotion.validFrom && promotion.validFrom > now) {
    throw new ApiError(409, "Promotion is not active yet");
  }

  if (promotion.validUntil && promotion.validUntil < now) {
    throw new ApiError(409, "Promotion has expired");
  }

  const campusTargets = promotion.campusTargets || { campusIds: [], campusNames: [] };
  if (campusTargets.campusIds.length > 0 || campusTargets.campusNames.length > 0) {
    const normalizedCampus = normalizeCampusValue(campus);
    const matchesCampusId = campusTargets.campusIds.some((item) => normalizeCampusValue(item) === normalizedCampus);
    const matchesCampusName = campusTargets.campusNames.some((item) => normalizeCampusValue(item) === normalizedCampus);

    if (!matchesCampusId && !matchesCampusName) {
      throw new ApiError(403, "Promotion is not available for this campus");
    }
  }

  if (promotion.maxTotalRedemptions !== null) {
    const totalRedemptions = await PromotionRedemption.countDocuments({ promotion: promotion._id });
    if (totalRedemptions >= promotion.maxTotalRedemptions) {
      throw new ApiError(409, "Promotion redemption limit has been reached");
    }
  }

  if (promotion.oneTimePerUser) {
    const priorRedemption = await PromotionRedemption.findOne({
      promotion: promotion._id,
      user: userId,
    });

    if (priorRedemption) {
      throw new ApiError(409, "Promotion can only be used once per user");
    }
  }
};

const computeTaskPromotionDiscount = ({ promotion, reward }) => {
  if (promotion.kind !== "task_discount") {
    throw new ApiError(400, "Promotion is not a task discount campaign");
  }

  const normalizedReward = Number(reward);
  if (!Number.isFinite(normalizedReward) || normalizedReward < 0) {
    throw new ApiError(400, "reward must be a non-negative number");
  }

  if (normalizedReward < promotion.minimumTaskReward) {
    throw new ApiError(409, `Promotion requires a minimum task reward of ${promotion.minimumTaskReward}`);
  }

  let discountAmount =
    promotion.discountType === "percentage"
      ? (normalizedReward * promotion.discountValue) / 100
      : promotion.discountValue;

  if (promotion.maxDiscountAmount !== null) {
    discountAmount = Math.min(discountAmount, promotion.maxDiscountAmount);
  }

  discountAmount = Math.min(discountAmount, normalizedReward);
  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalReward = Math.round((normalizedReward - discountAmount) * 100) / 100;

  return {
    originalReward: normalizedReward,
    discountAmount,
    finalReward,
  };
};

const validateTaskPromotion = async ({ code, userId, campus, reward }) => {
  const normalizedCode = normalizePromotionCode(code);
  if (!normalizedCode) {
    return null;
  }

  const promotion = await Promotion.findOne({ code: normalizedCode });
  await ensurePromotionActiveForUse({ promotion, userId, campus });

  const quote = computeTaskPromotionDiscount({ promotion, reward });

  return {
    promotion,
    ...quote,
    snapshot: {
      code: promotion.code,
      promotionId: promotion._id,
      kind: promotion.kind,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      discountAmount: quote.discountAmount,
      originalReward: quote.originalReward,
      finalReward: quote.finalReward,
      appliedAt: new Date(),
    },
  };
};

const recordTaskPromotionRedemption = async ({ promotionValidation, userId, taskId }) => {
  if (!promotionValidation) {
    return null;
  }

  return PromotionRedemption.create({
    promotion: promotionValidation.promotion._id,
    user: userId,
    task: taskId,
    code: promotionValidation.promotion.code,
    kind: promotionValidation.promotion.kind,
    discountAmount: promotionValidation.discountAmount,
    walletCreditAmount: 0,
  });
};

const claimWalletCreditPromotion = async ({ code, user }) => {
  const normalizedCode = normalizePromotionCode(code);
  if (!normalizedCode) {
    throw new ApiError(400, "code is required");
  }

  const promotion = await Promotion.findOne({ code: normalizedCode });
  const campus = user.campusId || user.campusName || "";
  await ensurePromotionActiveForUse({ promotion, userId: user._id, campus });

  if (promotion.kind !== "wallet_credit") {
    throw new ApiError(400, "Promotion is not a wallet credit campaign");
  }

  const reference = `PROMO-${promotion.code}-${user._id}`;
  const walletTransaction = await WalletTransaction.create({
    user: user._id,
    type: "credit",
    amount: promotion.walletCreditAmount,
    status: "completed",
    category: "promotion_credit",
    description: `Wallet credit promotion applied: ${promotion.code}`,
    reference,
    initiatedBy: user._id,
    failureReason: "",
    reviewNote: "",
  });

  const redemption = await PromotionRedemption.create({
    promotion: promotion._id,
    user: user._id,
    walletTransaction: walletTransaction._id,
    code: promotion.code,
    kind: promotion.kind,
    discountAmount: 0,
    walletCreditAmount: promotion.walletCreditAmount,
  });

  return {
    promotion,
    redemption,
    walletTransaction,
  };
};

export {
  claimWalletCreditPromotion,
  normalizePromotionCode,
  normalizePromotionPayload,
  recordTaskPromotionRedemption,
  validateTaskPromotion,
};