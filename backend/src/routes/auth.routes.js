import { Router } from "express";

import {
  listSessions,
  loginUser,
  logoutUser,
  refreshAccessToken,
  revokeSessionById,
  registerUser,
  verifySession,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/verify", verifyJWT, verifySession);
router.get("/sessions", verifyJWT, listSessions);
router.delete("/sessions/:sessionId", verifyJWT, revokeSessionById);

export default router;