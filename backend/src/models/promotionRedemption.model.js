import mongoose from "mongoose";

const promotionRedemptionSchema = new mongoose.Schema(
  {
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["task_discount", "wallet_credit"],
      required: true,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    walletCreditAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

promotionRedemptionSchema.index({ promotion: 1, createdAt: -1 });
promotionRedemptionSchema.index({ user: 1, promotion: 1, createdAt: -1 });

const PromotionRedemption = mongoose.model("PromotionRedemption", promotionRedemptionSchema);

export { PromotionRedemption };