import { Router } from "express";

import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  verifySession,
} from "../controllers/auth.controller.js";
import {
  createRateLimitMiddleware,
  rateLimitPolicies,
} from "../middlewares/rateLimit.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  createRateLimitMiddleware(rateLimitPolicies.authRegister),
  registerUser,
);
router.post(
  "/login",
  createRateLimitMiddleware(rateLimitPolicies.authLogin),
  loginUser,
);
router.post(
  "/refresh-token",
  createRateLimitMiddleware(rateLimitPolicies.authRefresh),
  refreshAccessToken,
);
router.post(
  "/logout",
  verifyJWT,
  createRateLimitMiddleware(rateLimitPolicies.authLogout),
  logoutUser,
);
router.get("/verify", verifyJWT, verifySession);

export default router;