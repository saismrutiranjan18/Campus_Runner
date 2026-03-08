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
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import { createMaintenanceGateMiddleware } from "../middlewares/maintenance.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/balance", getMyWalletBalance);
router.get("/transactions", listWalletTransactions);
router.post(
  "/withdrawals",
  authorizeRoles("runner"),
  createMaintenanceGateMiddleware("walletMutations"),
  createIdempotencyMiddleware(),
  createWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/approve",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createIdempotencyMiddleware(),
  approveWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/reject",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createIdempotencyMiddleware(),
  rejectWithdrawalRequest,
);
router.post(
  "/transactions/credit",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createIdempotencyMiddleware(),
  createCreditTransaction,
);
router.post(
  "/transactions/debit",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createIdempotencyMiddleware(),
  createDebitTransaction,
);
router.patch(
  "/transactions/:transactionId/status",
  authorizeRoles("admin"),
  createMaintenanceGateMiddleware("walletMutations"),
  createIdempotencyMiddleware(),
  updateWalletTransactionStatus,
);

export default router;