import { Router } from "express";

import {
  createCreditTransaction,
  createDebitTransaction,
  getMyWalletBalance,
  listWalletTransactions,
  updateWalletTransactionStatus,
} from "../controllers/wallet.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/balance", getMyWalletBalance);
router.get("/transactions", listWalletTransactions);
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