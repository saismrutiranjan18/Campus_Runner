import { ApiError } from "./ApiError.js";

const requiredEnvVars = [
  "PORT",
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_SECRET",
  "REFRESH_TOKEN_EXPIRY",
];

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new ApiError(
      500,
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }
};

export { validateEnv };