import { Router } from "express";

import {
  archiveTask,
  clearUserCooldown,
  createUserCooldown,
  createRunnerIncentiveRule,
  evaluateRunnerIncentiveRules,
  getAdminAnalyticsDashboard,
  getUserCampusScopes,
  getRequesterReputationById,
  getRequesterReputationMetrics,
  listFraudFlags,
  listRunnerIncentiveRules,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  listFraudFlags,
  listReportedIssues,
  listUserCooldowns,
  refundTaskLedger,
  restoreTask,
  restoreUser,
  suspendUser,
  updateRunnerIncentiveRule,
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
  getMaintenanceSettings,
  updateMaintenanceSettings,
} from "../controllers/maintenance.controller.js";
import { createPromotion, listPromotions, updatePromotion } from "../controllers/promotion.controller.js";
import { exportAdminResource } from "../controllers/adminExport.controller.js";
import {
  addReportAttachment,
  removeReportAttachment,
} from "../controllers/reportAttachment.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createRateLimitMiddleware,
  rateLimitPolicies,
} from "../middlewares/rateLimit.middleware.js";
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.use(verifyJWT, authorizeRoles("admin"));

router.get("/users/:userId/campus-scopes", getUserCampusScopes);
router.put(
  "/users/:userId/campus-scopes",
  createRateLimitMiddleware(rateLimitPolicies.adminSensitive),
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
router.get("/maintenance", getMaintenanceSettings);
router.patch("/maintenance", createIdempotencyMiddleware(), updateMaintenanceSettings);
router.get("/promotions", listPromotions);
router.post("/promotions", createIdempotencyMiddleware(), createPromotion);
router.patch("/promotions/:promotionId", createIdempotencyMiddleware(), updatePromotion);
router.get("/requesters/reputation", getRequesterReputationMetrics);
router.get("/requesters/:requesterId/reputation", getRequesterReputationById);
router.get("/runners/performance", getRunnerPerformanceMetrics);
router.get("/runners/:runnerId/performance", getRunnerPerformanceById);
router.get("/runner-incentives/rules", listRunnerIncentiveRules);
router.post(
  "/runner-incentives/rules",
  createIdempotencyMiddleware(),
  createRunnerIncentiveRule,
);
router.patch(
  "/runner-incentives/rules/:ruleId",
  createIdempotencyMiddleware(),
  updateRunnerIncentiveRule,
);
router.post(
  "/runner-incentives/evaluate",
  createIdempotencyMiddleware(),
  evaluateRunnerIncentiveRules,
);
router.get("/analytics/dashboard", getAdminAnalyticsDashboard);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/users/:userId/restore", restoreUser);
router.patch("/tasks/:taskId/archive", archiveTask);
router.patch("/tasks/:taskId/restore", restoreTask);
router.get("/exports/:resource", exportAdminResource);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/tasks/:taskId/archive", archiveTask);
router.patch(
  "/users/:userId/suspend",
  createRateLimitMiddleware(rateLimitPolicies.adminSensitive),
  suspendUser,
);
router.patch(
  "/tasks/:taskId/archive",
  createRateLimitMiddleware(rateLimitPolicies.adminSensitive),
  archiveTask,
);
router.get("/fraud-flags", listFraudFlags);
router.patch(
  "/fraud-flags/:flagId/status",
  createRateLimitMiddleware(rateLimitPolicies.adminSensitive),
router.patch("/users/:userId/suspend", createIdempotencyMiddleware(), suspendUser);
router.patch("/tasks/:taskId/archive", createIdempotencyMiddleware(), archiveTask);
router.patch("/tasks/:taskId/refund", createIdempotencyMiddleware(), refundTaskLedger);
router.get("/fraud-flags", listFraudFlags);
router.patch(
  "/fraud-flags/:flagId/status",
  createIdempotencyMiddleware(),
  updateFraudFlagStatus,
);
router.get("/reports", listReportedIssues);
router.post("/reports/:reportId/attachments", addReportAttachment);
router.delete("/reports/:reportId/attachments/:attachmentId", removeReportAttachment);
router.patch("/reports/:reportId/status", updateReportStatus);
router.patch(
  "/reports/:reportId/status",
  createRateLimitMiddleware(rateLimitPolicies.adminSensitive),
  createIdempotencyMiddleware(),
  updateReportStatus,
);

export default router;