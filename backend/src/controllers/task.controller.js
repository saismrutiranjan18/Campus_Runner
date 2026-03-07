import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTaskPlaceholder = asyncHandler(async (req, res) => {
  res.status(201).json(
    new ApiResponse(
      201,
      {
        requestedBy: req.user.email,
        role: req.user.role,
      },
      "Task creation route is protected and ready for real task service integration",
    ),
  );
});

const acceptTaskPlaceholder = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        taskId: req.params.taskId,
        acceptedBy: req.user.email,
        role: req.user.role,
      },
      "Task acceptance route is protected and ready for runner assignment logic",
    ),
  );
});

const listProtectedTaskActions = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
        },
        allowedActions:
          req.user.role === "requester"
            ? ["create-task", "view-own-tasks"]
            : req.user.role === "runner"
              ? ["accept-task", "complete-task", "view-assigned-tasks"]
              : ["create-task", "accept-task", "manage-all-tasks"],
      },
      "Protected task actions fetched successfully",
    ),
  );
});

export {
  acceptTaskPlaceholder,
  createTaskPlaceholder,
  listProtectedTaskActions,
};