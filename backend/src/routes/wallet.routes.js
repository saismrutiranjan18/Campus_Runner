import { Router } from "express";

import {
  approveWithdrawalRequest,
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
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/balance", getMyWalletBalance);
router.get("/transactions", listWalletTransactions);
router.post(
  "/withdrawals",
  authorizeRoles("runner"),
  createIdempotencyMiddleware(),
  createWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/approve",
  authorizeRoles("admin"),
  createIdempotencyMiddleware(),
  approveWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/reject",
  authorizeRoles("admin"),
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
  createIdempotencyMiddleware(),
  createCreditTransaction,
);
router.post(
  "/transactions/debit",
  authorizeRoles("admin"),
  createIdempotencyMiddleware(),
  createDebitTransaction,
);
router.patch(
  "/transactions/:transactionId/status",
  authorizeRoles("admin"),
  createIdempotencyMiddleware(),
  updateWalletTransactionStatus,
);

export default router;