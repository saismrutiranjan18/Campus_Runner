import { Router } from "express";

import {
  archiveTask,
  getUserCampusScopes,
  listFraudFlags,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  getAdminAnalyticsDashboard,
  listReportedIssues,
  suspendUser,
  updateFraudFlagStatus,
  updateReportStatus,
  updateUserCampusScopes,
} from "../controllers/admin.controller.js";
import {
  createCampusConfig,
  getCampusConfigById,
  listCampusConfigs,
  updateCampusConfig,
  updateCampusOperationalSettings,
  updateCampusTransportRules,
} from "../controllers/campusConfig.controller.js";
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
router.get("/campuses", listCampusConfigs);
router.post("/campuses", createIdempotencyMiddleware(), createCampusConfig);
router.get("/campuses/:campusId", getCampusConfigById);
router.patch("/campuses/:campusId", createIdempotencyMiddleware(), updateCampusConfig);
router.patch(
  "/campuses/:campusId/transport-rules",
  createIdempotencyMiddleware(),
  updateCampusTransportRules,
);
router.patch(
  "/campuses/:campusId/operational-settings",
  createIdempotencyMiddleware(),
  updateCampusOperationalSettings,
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