import { Router } from "express";

import {
  createDispute,
  getDisputeById,
  listAllDisputes,
  listMyDisputes,
  updateDisputeStatus,
} from "../controllers/dispute.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/mine", listMyDisputes);
router.get("/", authorizeRoles("admin"), listAllDisputes);
router.get("/:disputeId", getDisputeById);
router.post("/", authorizeRoles("requester", "runner"), createDispute);
router.patch("/:disputeId/status", authorizeRoles("admin"), updateDisputeStatus);

export default router;