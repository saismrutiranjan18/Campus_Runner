import { Router } from "express";

import {
  approveWithdrawalRequest,
  claimPromotionWalletCredit,
  createCreditTransaction,
  createDebitTransaction,
  createWithdrawalRequest,
  getMyWalletBalance,
  listWalletTransactions,
  rejectWithdrawalRequest,
  retryFailedWithdrawalRequest,
  supersedeFailedWithdrawalRequest,
  updateWalletTransactionStatus,
  voidFailedWithdrawalRequest,
} from "../controllers/wallet.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createRateLimitMiddleware,
  rateLimitPolicies,
} from "../middlewares/rateLimit.middleware.js";
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import { createMaintenanceGateMiddleware } from "../middlewares/maintenance.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/balance", getMyWalletBalance);
router.get("/transactions", listWalletTransactions);
router.post("/promotions/claim", createIdempotencyMiddleware(), claimPromotionWalletCredit);
router.post(
  "/withdrawals",
  authorizeRoles("runner"),
  createMaintenanceGateMiddleware("walletMutations"),
  createRateLimitMiddleware(rateLimitPolicies.walletChange),
  createIdempotencyMiddleware(),
  createWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/approve",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createRateLimitMiddleware(rateLimitPolicies.walletChange),
  createIdempotencyMiddleware(),
  approveWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/reject",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createRateLimitMiddleware(rateLimitPolicies.walletChange),
  createIdempotencyMiddleware(),
  rejectWithdrawalRequest,
);
router.post(
  "/withdrawals/:transactionId/retry",
  authorizeRoles("admin"),
  createIdempotencyMiddleware(),
  retryFailedWithdrawalRequest,
);
router.post(
  "/withdrawals/:transactionId/supersede",
  authorizeRoles("admin"),
  createIdempotencyMiddleware(),
  supersedeFailedWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/void",
  authorizeRoles("admin"),
  createIdempotencyMiddleware(),
  voidFailedWithdrawalRequest,
);
router.post(
  "/transactions/credit",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createRateLimitMiddleware(rateLimitPolicies.walletChange),
  createIdempotencyMiddleware(),
  createCreditTransaction,
);
router.post(
  "/transactions/debit",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createRateLimitMiddleware(rateLimitPolicies.walletChange),
  createIdempotencyMiddleware(),
  createDebitTransaction,
);
router.patch(
  "/transactions/:transactionId/status",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createRateLimitMiddleware(rateLimitPolicies.walletChange),
  createIdempotencyMiddleware(),
  updateWalletTransactionStatus,
);

export default router;