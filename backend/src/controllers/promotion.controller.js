import mongoose from "mongoose";

import { Promotion } from "../models/promotion.model.js";
import { normalizePromotionPayload } from "../services/promotion.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sanitizePromotion = (promotion) => ({
  id: promotion._id,
  code: promotion.code,
  title: promotion.title,
  description: promotion.description,
  kind: promotion.kind,
  discountType: promotion.discountType,
  discountValue: promotion.discountValue,
  maxDiscountAmount: promotion.maxDiscountAmount,
  walletCreditAmount: promotion.walletCreditAmount,
  minimumTaskReward: promotion.minimumTaskReward,
  campusTargets: promotion.campusTargets,
  oneTimePerUser: promotion.oneTimePerUser,
  maxTotalRedemptions: promotion.maxTotalRedemptions,
  validFrom: promotion.validFrom,
  validUntil: promotion.validUntil,
  isActive: promotion.isActive,
  createdAt: promotion.createdAt,
  updatedAt: promotion.updatedAt,
});

const listPromotions = asyncHandler(async (_req, res) => {
  const promotions = await Promotion.find({}).sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: promotions.map(sanitizePromotion),
        total: promotions.length,
      },
      "Promotions fetched successfully",
    ),
  );
});

const createPromotion = asyncHandler(async (req, res) => {
  const payload = normalizePromotionPayload(req.body);
  const promotion = await Promotion.create(payload);

  res.status(201).json(
    new ApiResponse(201, sanitizePromotion(promotion), "Promotion created successfully"),
  );
});

const updatePromotion = asyncHandler(async (req, res) => {
  const { promotionId } = req.params;

  if (!mongoose.isValidObjectId(promotionId)) {
    throw new ApiError(400, "Invalid promotion id provided");
  }

  const existingPromotion = await Promotion.findById(promotionId);
  if (!existingPromotion) {
    throw new ApiError(404, "Promotion not found");
  }

  const payload = normalizePromotionPayload(req.body, existingPromotion);

  Object.assign(existingPromotion, payload);
  await existingPromotion.save();

  res.status(200).json(
    new ApiResponse(200, sanitizePromotion(existingPromotion), "Promotion updated successfully"),
  );
});

export { createPromotion, listPromotions, sanitizePromotion, updatePromotion };