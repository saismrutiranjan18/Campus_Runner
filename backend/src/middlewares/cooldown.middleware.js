import { User } from "../models/user.model.js";
import {
  getActiveCooldownForAction,
  getCooldownActionLabel,
} from "../services/cooldown.service.js";

const createCooldownMiddleware = ({ action, bypassRoles = ["admin"] }) => {
  return async (req, res, next) => {
    if (!req.user || !action) {
      next();
      return;
    }

    if (bypassRoles.includes(req.user.role)) {
      next();
      return;
    }

    const user = await User.findById(req.user._id);
    const activeCooldown = getActiveCooldownForAction(user, action);

    if (!activeCooldown) {
      next();
      return;
    }

    const remainingSeconds = Math.max(
      1,
      Math.ceil((activeCooldown.endsAt.getTime() - Date.now()) / 1000),
    );

    res.set("Retry-After", String(remainingSeconds));
    res.status(429).json({
      success: false,
      message: `${getCooldownActionLabel(action)} is temporarily unavailable because this account is in cooldown.`,
      data: {
        action,
        reason: activeCooldown.reason,
        sourceType: activeCooldown.sourceType,
        endsAt: activeCooldown.endsAt,
        remainingSeconds,
      },
    });
  };
};

export { createCooldownMiddleware };