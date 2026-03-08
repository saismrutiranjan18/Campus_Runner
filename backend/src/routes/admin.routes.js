import { Router } from "express";

import {
  archiveTask,
  getAdminAnalyticsDashboard,
  getUserCampusScopes,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  listFraudFlags,
  listReportedIssues,
  suspendUser,
  updateFraudFlagStatus,
  updateReportStatus,
  updateUserCampusScopes,
} from "../controllers/admin.controller.js";
import { exportAdminResource } from "../controllers/adminExport.controller.js";
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
router.get("/runners/performance", getRunnerPerformanceMetrics);
router.get("/runners/:runnerId/performance", getRunnerPerformanceById);
router.get("/analytics/dashboard", getAdminAnalyticsDashboard);
router.get("/exports/:resource", exportAdminResource);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/tasks/:taskId/archive", archiveTask);
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