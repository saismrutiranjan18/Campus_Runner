import { Router } from "express";

import {
  acceptTaskPlaceholder,
  createTaskPlaceholder,
  listProtectedTaskActions,
} from "../controllers/task.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/protected-actions", listProtectedTaskActions);
router.post("/", authorizeRoles("requester", "admin"), createTaskPlaceholder);
router.patch(
  "/:taskId/accept",
  authorizeRoles("runner", "admin"),
  acceptTaskPlaceholder,
);

export default router;