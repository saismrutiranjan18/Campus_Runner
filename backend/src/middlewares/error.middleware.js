import { ApiError } from "../utils/ApiError.js";

const errorHandler = (error, _, res, __) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    errors: error.errors || [],
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
};

export { errorHandler };