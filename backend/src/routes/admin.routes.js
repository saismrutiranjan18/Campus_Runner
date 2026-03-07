import { Router } from "express";

import {
  archiveTask,
  getRunnerPerformanceById,
  getRunnerPerformanceMetrics,
  listReportedIssues,
  suspendUser,
  updateReportStatus,
} from "../controllers/admin.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT, authorizeRoles("admin"));

router.get("/runners/performance", getRunnerPerformanceMetrics);
router.get("/runners/:runnerId/performance", getRunnerPerformanceById);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/tasks/:taskId/archive", archiveTask);
router.get("/reports", listReportedIssues);
router.patch("/reports/:reportId/status", updateReportStatus);

export default router;