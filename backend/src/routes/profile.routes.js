import { Router } from "express";

import {
  getMyProfile,
  updateMyProfile,
  updateUserRole,
} from "../controllers/profile.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.patch("/:userId/role", authorizeRoles("admin"), updateUserRole);

export default router;