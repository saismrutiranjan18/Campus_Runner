import { Router } from "express";

import {
  deleteUserProfile,
  getMyProfile,
  getUserProfileById,
  listProfiles,
  updateMyProfile,
  updateUserActiveStatus,
  updateUserProfileByAdmin,
  updateUserRole,
  updateUserVerificationStatus,
} from "../controllers/profile.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.get("/", authorizeRoles("admin"), listProfiles);
router.get("/:userId", authorizeRoles("admin"), getUserProfileById);
router.patch("/:userId", authorizeRoles("admin"), updateUserProfileByAdmin);
router.patch("/:userId/role", authorizeRoles("admin"), updateUserRole);
router.patch(
  "/:userId/verification",
  authorizeRoles("admin"),
  updateUserVerificationStatus,
);
router.patch(
  "/:userId/status",
  authorizeRoles("admin"),
  updateUserActiveStatus,
);
router.delete("/:userId", authorizeRoles("admin"), deleteUserProfile);

export default router;