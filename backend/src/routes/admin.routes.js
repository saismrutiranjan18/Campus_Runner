import { Router } from "express";

import {
  archiveTask,
  clearUserCooldown,
  createUserCooldown,
  getUserCampusScopes,
  listFraudFlags,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  getAdminAnalyticsDashboard,
  listReportedIssues,
  listUserCooldowns,
  suspendUser,
  updateFraudFlagStatus,
  updateReportStatus,
  updateUserCampusScopes,
} from "../controllers/admin.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.use(verifyJWT, authorizeRoles("admin"));

router.get("/users/:userId/campus-scopes", getUserCampusScopes);
router.put(
  "/users/:userId/campus-scopes",
  createIdempotencyMiddleware(),
  updateUserCampusScopes,
);
router.get("/users/:userId/cooldowns", listUserCooldowns);
router.post(
  "/users/:userId/cooldowns",
  createIdempotencyMiddleware(),
  createUserCooldown,
);
router.patch(
  "/users/:userId/cooldowns/:cooldownId/clear",
  createIdempotencyMiddleware(),
  clearUserCooldown,
);
router.get("/runners/performance", getRunnerPerformanceMetrics);
router.get("/runners/:runnerId/performance", getRunnerPerformanceById);
router.get("/analytics/dashboard", getAdminAnalyticsDashboard);
router.patch("/users/:userId/suspend", createIdempotencyMiddleware(), suspendUser);
router.patch("/tasks/:taskId/archive", createIdempotencyMiddleware(), archiveTask);
router.get("/fraud-flags", listFraudFlags);
router.patch(
  "/fraud-flags/:flagId/status",
  createIdempotencyMiddleware(),
  updateFraudFlagStatus,
);
router.get("/reports", listReportedIssues);
router.patch(
  "/reports/:reportId/status",
  createIdempotencyMiddleware(),
  updateReportStatus,
);

export default router;