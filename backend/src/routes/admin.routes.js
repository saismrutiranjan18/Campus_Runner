import { Router } from "express";

import {
  archiveTask,
  getUserCampusScopes,
  getAdminAnalyticsDashboard,
  listReportedIssues,
  suspendUser,
  updateReportStatus,
  updateUserCampusScopes,
} from "../controllers/admin.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT, authorizeRoles("admin"));

router.get("/users/:userId/campus-scopes", getUserCampusScopes);
router.put("/users/:userId/campus-scopes", updateUserCampusScopes);
router.get("/analytics/dashboard", getAdminAnalyticsDashboard);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/tasks/:taskId/archive", archiveTask);
router.get("/reports", listReportedIssues);
router.patch("/reports/:reportId/status", updateReportStatus);

export default router;