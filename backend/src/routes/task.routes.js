import { Router } from "express";

import {
  acceptTask,
  cancelTask,
  completeTask,
  createTask,
  getTaskById,
  listRequesterTaskHistory,
  listTasks,
  listOpenTasks,
  listProtectedTaskActions,
  markTaskInProgress,
} from "../controllers/task.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createRateLimitMiddleware,
  rateLimitPolicies,
} from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/protected-actions", listProtectedTaskActions);
router.get("/history", authorizeRoles("requester"), listRequesterTaskHistory);
router.get("/", listTasks);
router.get("/open", listOpenTasks);
router.get("/:taskId", getTaskById);
router.post(
  "/",
  authorizeRoles("requester", "admin"),
  createRateLimitMiddleware(rateLimitPolicies.taskCreate),
  createTask,
);
router.patch("/:taskId/accept", authorizeRoles("runner", "admin"), acceptTask);
router.patch(
  "/:taskId/in-progress",
  authorizeRoles("runner", "admin"),
  markTaskInProgress,
);
router.patch("/:taskId/complete", authorizeRoles("runner", "admin"), completeTask);
router.patch(
  "/:taskId/cancel",
  authorizeRoles("requester", "admin"),
  createRateLimitMiddleware(rateLimitPolicies.taskCancel),
  cancelTask,
);

export default router;