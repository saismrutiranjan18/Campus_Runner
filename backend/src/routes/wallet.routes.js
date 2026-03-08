import { Router } from "express";

import {
  approveWithdrawalRequest,
  createCreditTransaction,
  createDebitTransaction,
  createWithdrawalRequest,
  getMyWalletBalance,
  listWalletTransactions,
  rejectWithdrawalRequest,
  updateWalletTransactionStatus,
} from "../controllers/wallet.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import { createCooldownMiddleware } from "../middlewares/cooldown.middleware.js";
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/balance", getMyWalletBalance);
router.get("/transactions", listWalletTransactions);
router.post(
  "/withdrawals",
  authorizeRoles("runner"),
  createCooldownMiddleware({ action: "wallet_withdrawal", bypassRoles: [] }),
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