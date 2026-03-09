import mongoose from "mongoose";

const allowedPromotionKinds = ["task_discount", "wallet_credit"];
const allowedPromotionDiscountTypes = ["fixed", "percentage"];

const promotionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    kind: {
      type: String,
      enum: allowedPromotionKinds,
      required: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: allowedPromotionDiscountTypes,
      default: "fixed",
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    walletCreditAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    minimumTaskReward: {
      type: Number,
      min: 0,
      default: 0,
    },
    campusTargets: {
      campusIds: {
        type: [String],
        default: [],
      },
      campusNames: {
        type: [String],
        default: [],
      },
    },
    oneTimePerUser: {
      type: Boolean,
      default: false,
    },
    maxTotalRedemptions: {
      type: Number,
      min: 0,
      default: null,
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validUntil: {
      type: Date,
      default: null,
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

promotionSchema.index({ kind: 1, isActive: 1, code: 1 });

const Promotion = mongoose.model("Promotion", promotionSchema);

export { Promotion, allowedPromotionDiscountTypes, allowedPromotionKinds };