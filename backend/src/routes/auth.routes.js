import { Router } from "express";

import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  verifySession,
} from "../controllers/auth.controller.js";
import { createMaintenanceGateMiddleware } from "../middlewares/maintenance.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", createMaintenanceGateMiddleware("registration"), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/verify", verifyJWT, verifySession);

export default router;