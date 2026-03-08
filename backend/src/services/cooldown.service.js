import { User, allowedCooldownActions } from "../models/user.model.js";

const cooldownActionLabels = {
  task_creation: "Task creation",
  task_cancellation: "Task cancellation",
  task_acceptance: "Task acceptance",
  wallet_withdrawal: "Wallet withdrawals",
};

const cooldownPolicies = {
  repeated_cancellations: {
    medium: {
      durationHours: 12,
      targets: (flag) => [
        { userId: flag.user, action: "task_creation" },
        { userId: flag.user, action: "task_cancellation" },
      ],
    },
    high: {
      durationHours: 24,
      targets: (flag) => [
        { userId: flag.user, action: "task_creation" },
        { userId: flag.user, action: "task_cancellation" },
      ],
    },
  },
  wallet_abuse: {
    medium: {
      durationHours: 24,
      targets: (flag) => [{ userId: flag.user, action: "wallet_withdrawal" }],
    },
    high: {
      durationHours: 48,
      targets: (flag) => [{ userId: flag.user, action: "wallet_withdrawal" }],
    },
  },
  unusually_fast_completion: {
    medium: {
      durationHours: 6,
      targets: (flag) => [{ userId: flag.user, action: "task_acceptance" }],
    },
    high: {
      durationHours: 12,
      targets: (flag) => [{ userId: flag.user, action: "task_acceptance" }],
    },
  },
  self_dealing_pattern: {
    medium: {
      durationHours: 12,
      targets: (flag) => [{ userId: flag.secondaryUser, action: "task_acceptance" }],
    },
    high: {
      durationHours: 24,
      targets: (flag) => [{ userId: flag.secondaryUser, action: "task_acceptance" }],
    },
  },
};

const isCooldownActive = (cooldown, now = new Date()) => {
  return Boolean(cooldown && !cooldown.clearedAt && cooldown.endsAt > now);
};

const getActiveCooldownForAction = (user, action, now = new Date()) => {
  const matchingCooldowns = (user?.cooldowns || []).filter(
    (cooldown) => cooldown.action === action && isCooldownActive(cooldown, now),
  );

  if (matchingCooldowns.length === 0) {
    return null;
  }

  return matchingCooldowns.sort((left, right) => right.endsAt - left.endsAt)[0];
};

const getCooldownActionLabel = (action) => {
  return cooldownActionLabels[action] || "This action";
};

const applyUserCooldown = async ({
  userId,
  action,
  durationHours,
  reason,
  sourceType,
  triggeredBy = null,
  metadata = {},
}) => {
  if (!userId || !allowedCooldownActions.includes(action) || durationHours <= 0) {
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  let cooldown = user.cooldowns.find(
    (entry) => entry.action === action && !entry.clearedAt && entry.endsAt > now,
  );

  if (!cooldown) {
    user.cooldowns.push({
      action,
      reason,
      sourceType,
      startsAt: now,
      endsAt,
      triggeredBy,
      metadata,
    });
    cooldown = user.cooldowns[user.cooldowns.length - 1];
  } else {
    cooldown.reason = reason;
    cooldown.sourceType = sourceType;
    cooldown.triggeredBy = triggeredBy || cooldown.triggeredBy;
    cooldown.metadata = metadata;

    if (endsAt > cooldown.endsAt) {
      cooldown.endsAt = endsAt;
    }
  }

  await user.save({ validateBeforeSave: false });

  return cooldown;
};

const syncAutomaticCooldownsForFraudFlag = async (flag) => {
  const policyBySeverity = cooldownPolicies[flag?.flagType];
  const policy = policyBySeverity?.[flag?.severity];

  if (!policy) {
    return [];
  }

  const targets = policy.targets(flag).filter((target) => target.userId && target.action);
  const reason = `${flag.title} Automatic cooldown applied while suspicious activity is reviewed.`;

  return Promise.all(
    targets.map((target) =>
      applyUserCooldown({
        userId: target.userId,
        action: target.action,
        durationHours: policy.durationHours,
        reason,
        sourceType: flag.flagType,
        metadata: {
          fraudFlagId: String(flag._id),
          severity: flag.severity,
        },
      }),
    ),
  );
};

export {
  applyUserCooldown,
  getActiveCooldownForAction,
  getCooldownActionLabel,
  isCooldownActive,
  syncAutomaticCooldownsForFraudFlag,
};