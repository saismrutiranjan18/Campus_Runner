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

const router = Router();

router.use(verifyJWT);

router.get("/balance", getMyWalletBalance);
router.get("/transactions", listWalletTransactions);
router.post("/withdrawals", authorizeRoles("runner"), createWithdrawalRequest);
router.patch(
  "/withdrawals/:transactionId/approve",
  authorizeRoles("admin"),
  approveWithdrawalRequest,
);
router.patch(
  "/withdrawals/:transactionId/reject",
  authorizeRoles("admin"),
  rejectWithdrawalRequest,
);
router.post(
  "/transactions/credit",
  authorizeRoles("admin"),
  createCreditTransaction,
);
router.post(
  "/transactions/debit",
  authorizeRoles("admin"),
  createDebitTransaction,
);
router.patch(
  "/transactions/:transactionId/status",
  authorizeRoles("admin"),
  updateWalletTransactionStatus,
);

export default router;