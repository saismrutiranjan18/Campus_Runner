import { Router } from "express";

import {
  claimReferralCode,
  getMyReferralSummary,
  getReferralByInviteeId,
} from "../controllers/referral.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/me", getMyReferralSummary);
router.post("/claim", createIdempotencyMiddleware(), claimReferralCode);
router.get("/users/:userId", authorizeRoles("admin"), getReferralByInviteeId);

export default router;