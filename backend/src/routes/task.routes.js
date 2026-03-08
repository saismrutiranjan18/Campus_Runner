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
import { createCooldownMiddleware } from "../middlewares/cooldown.middleware.js";
import { createIdempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

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
  createCooldownMiddleware({ action: "task_creation" }),
  createIdempotencyMiddleware(),
  createTask,
);
router.patch(
  "/:taskId/accept",
  authorizeRoles("runner", "admin"),
  createCooldownMiddleware({ action: "task_acceptance" }),
  createIdempotencyMiddleware(),
  acceptTask,
);
router.patch(
  "/:taskId/in-progress",
  authorizeRoles("runner", "admin"),
  createIdempotencyMiddleware(),
  markTaskInProgress,
);
router.patch(
  "/:taskId/complete",
  authorizeRoles("runner", "admin"),
  createIdempotencyMiddleware(),
  completeTask,
);
router.patch(
  "/:taskId/cancel",
  authorizeRoles("requester", "admin"),
  createCooldownMiddleware({ action: "task_cancellation" }),
  createIdempotencyMiddleware(),
  cancelTask,
);

export default router;