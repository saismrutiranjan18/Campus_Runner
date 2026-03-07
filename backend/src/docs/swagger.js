const bearerSecurityScheme = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  },
};

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "67ca72d999ea40f2abc12345" },
    fullName: { type: "string", example: "Dinesh Kumar" },
    email: {
      type: "string",
      format: "email",
      example: "dinesh@vitbhopal.ac.in",
    },
    phoneNumber: { type: "string", example: "+91-9876543210" },
    campusId: { type: "string", example: "vit-bhopal" },
    campusName: { type: "string", example: "VIT Bhopal" },
    campusScopes: {
      type: "array",
      items: { $ref: "#/components/schemas/CampusScope" },
    },
    role: { type: "string", enum: ["requester", "runner", "admin"] },
    isVerified: { type: "boolean", example: true },
    isActive: { type: "boolean", example: true },
    suspendedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    suspensionReason: { type: "string", example: "Suspended by admin moderation" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const taskSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "67ca72d999ea40f2abc98765" },
    title: { type: "string", example: "Pick up lab printouts" },
    description: {
      type: "string",
      example: "Collect the printed assignment from Block A and deliver it to Hostel 3.",
    },
    pickupLocation: { type: "string", example: "Academic Block A" },
    dropoffLocation: { type: "string", example: "Hostel 3 Reception" },
    campus: { type: "string", example: "VIT Bhopal" },
    transportMode: {
      type: "string",
      enum: ["walk", "bike", "car", "public_transport", "other"],
      example: "bike",
    },
    reward: { type: "number", example: 80 },
    status: {
      type: "string",
      enum: ["open", "accepted", "in_progress", "completed", "cancelled"],
      example: "open",
    },
    isArchived: { type: "boolean", example: false },
    archivedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    archiveReason: { type: "string", example: "Archived by admin moderation" },
    requestedBy: { $ref: "#/components/schemas/User" },
    assignedRunner: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    archivedBy: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    acceptedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    assignmentExpiresAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    startedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    completedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    cancelledAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    cancellationReason: { type: "string", example: "Requester no longer needs the task" },
    lastExpiredAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    reopenedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    expiryReopenCount: { type: "integer", example: 1 },
    expirationReason: {
      type: "string",
      example: "Task acceptance expired after 900000ms",
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const walletTransactionSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "67ca72d999ea40f2abc45678" },
    user: { $ref: "#/components/schemas/User" },
    type: { type: "string", enum: ["credit", "debit"], example: "credit" },
    amount: { type: "number", example: 150 },
    status: {
      type: "string",
      enum: ["pending", "completed", "failed"],
      example: "completed",
    },
    description: {
      type: "string",
      example: "Manual payout credit for completed campus task",
    },
    reference: { type: "string", example: "TASK-PAYOUT-001" },
    failureReason: { type: "string", example: "Bank transfer rejected" },
    initiatedBy: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const walletBalanceSchema = {
  type: "object",
  properties: {
    userId: { type: "string", example: "67ca72d999ea40f2abc12345" },
    currentBalance: { type: "number", example: 420 },
    totalCredited: { type: "number", example: 650 },
    totalDebited: { type: "number", example: 230 },
    pendingCredits: { type: "number", example: 100 },
    pendingDebits: { type: "number", example: 50 },
    failedTransactions: { type: "integer", example: 1 },
    transactionCount: { type: "integer", example: 8 },
    currency: { type: "string", example: "INR" },
  },
};

const reportSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "67ca72d999ea40f2abc65432" },
    entityType: { type: "string", enum: ["user", "task"], example: "task" },
    reporter: { $ref: "#/components/schemas/User" },
    reportedUser: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    reportedTask: {
      anyOf: [{ $ref: "#/components/schemas/Task" }, { type: "null" }],
    },
    reason: { type: "string", example: "Fake task listing" },
    details: { type: "string", example: "The requester repeatedly posts invalid offers." },
    status: {
      type: "string",
      enum: ["open", "reviewed", "resolved", "dismissed"],
      example: "open",
    },
    reviewedBy: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    reviewedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    resolutionNote: { type: "string", example: "Suspended offending user and archived related task." },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const apiResponse = (dataSchema, messageExample = "Success") => ({
  type: "object",
  properties: {
    statusCode: { type: "integer", example: 200 },
    data: dataSchema,
    message: { type: "string", example: messageExample },
    success: { type: "boolean", example: true },
  },
});

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Campus Runner Backend API",
    version: "1.0.0",
    description:
      "JWT authentication, role-based authorization, profile, task, wallet, admin moderation, and background task expiry APIs for Campus Runner.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Health", description: "Service status routes" },
    { name: "Auth", description: "Authentication and session routes" },
    { name: "Profile", description: "Protected profile routes" },
    { name: "Tasks", description: "Protected task lifecycle routes" },
    { name: "Wallet", description: "Wallet balance and ledger routes" },
    { name: "Admin", description: "Admin moderation routes" },
  ],
  components: {
    securitySchemes: bearerSecurityScheme,
    schemas: {
      User: userSchema,
      Task: taskSchema,
      WalletTransaction: walletTransactionSchema,
      WalletBalance: walletBalanceSchema,
      Report: reportSchema,
      CampusScope: {
        type: "object",
        properties: {
          campusId: { type: "string", example: "north-campus" },
          campusName: { type: "string", example: "North Campus" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["fullName", "email", "password"],
        properties: {
          fullName: { type: "string", example: "Dinesh Kumar" },
          email: {
            type: "string",
            format: "email",
            example: "dinesh@vitbhopal.ac.in",
          },
          password: { type: "string", example: "strongPassword123" },
          phoneNumber: { type: "string", example: "+91-9876543210" },
          campusId: { type: "string", example: "vit-bhopal" },
          campusName: { type: "string", example: "VIT Bhopal" },
          role: {
            type: "string",
            enum: ["requester", "runner", "admin"],
            example: "requester",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "dinesh@vitbhopal.ac.in",
          },
          password: { type: "string", example: "strongPassword123" },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        properties: {
          refreshToken: { type: "string", example: "eyJhbGciOiJI..." },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", example: "Dinesh Kumar" },
          phoneNumber: { type: "string", example: "+91-9876543210" },
          campusId: { type: "string", example: "vit-bhopal" },
          campusName: { type: "string", example: "VIT Bhopal" },
        },
      },
      AdminUpdateProfileRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", example: "Dinesh Kumar" },
          phoneNumber: { type: "string", example: "+91-9876543210" },
          campusId: { type: "string", example: "vit-bhopal" },
          campusName: { type: "string", example: "VIT Bhopal" },
          role: {
            type: "string",
            enum: ["requester", "runner", "admin"],
            example: "runner",
          },
          isVerified: { type: "boolean", example: true },
          isActive: { type: "boolean", example: true },
        },
      },
      UpdateRoleRequest: {
        type: "object",
        required: ["role"],
        properties: {
          role: {
            type: "string",
            enum: ["requester", "runner", "admin"],
            example: "runner",
          },
        },
      },
      UpdateVerificationRequest: {
        type: "object",
        required: ["isVerified"],
        properties: {
          isVerified: { type: "boolean", example: true },
        },
      },
      UpdateStatusRequest: {
        type: "object",
        required: ["isActive"],
        properties: {
          isActive: { type: "boolean", example: false },
        },
      },
      CreateTaskRequest: {
        type: "object",
        required: ["title", "description", "pickupLocation", "dropoffLocation", "campus"],
        properties: {
          title: { type: "string", example: "Pick up lab printouts" },
          description: {
            type: "string",
            example: "Collect the printed assignment from Block A and deliver it to Hostel 3.",
          },
          pickupLocation: { type: "string", example: "Academic Block A" },
          dropoffLocation: { type: "string", example: "Hostel 3 Reception" },
          campus: { type: "string", example: "VIT Bhopal" },
          transportMode: {
            type: "string",
            enum: ["walk", "bike", "car", "public_transport", "other"],
            example: "bike",
          },
          reward: { type: "number", example: 80 },
        },
      },
      UpdateCampusScopesRequest: {
        type: "object",
        required: ["campusScopes"],
        properties: {
          campusScopes: {
            type: "array",
            items: { $ref: "#/components/schemas/CampusScope" },
          },
        },
      },
      CampusScopesResponse: apiResponse(
        {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            campusScopes: {
              type: "array",
              items: { $ref: "#/components/schemas/CampusScope" },
            },
          },
        },
        "User campus scopes fetched successfully",
      ),
      TaskFeedResponse: apiResponse(
        {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/Task" },
            },
            pagination: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["page", "cursor"], example: "page" },
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 42 },
                totalPages: { type: "integer", example: 3 },
                hasMore: { type: "boolean", example: true },
                nextCursor: { type: "string", nullable: true, example: "eyJjcmVhdGVkQXQiOiIyMDI2LTAzLTA3VDE0OjAwOjAwLjAwMFoiLCJpZCI6IjY3Y2E3MmQ5OTllYTQwZjJhYmM5ODc2NSJ9" },
                sort: { type: "string", enum: ["asc", "desc"], example: "desc" },
              },
            },
            filters: {
              type: "object",
              properties: {
                search: { type: "string", example: "lab" },
                campus: { type: "string", example: "VIT Bhopal" },
                status: { type: "string", example: "open" },
                transportMode: { type: "string", example: "bike" },
              },
            },
          },
        },
        "Tasks fetched successfully",
      ),
      CancelTaskRequest: {
        type: "object",
        properties: {
          cancellationReason: {
            type: "string",
            example: "Requester no longer needs the item delivered",
          },
        },
      },
      CreateWalletTransactionRequest: {
        type: "object",
        required: ["userId", "amount", "description"],
        properties: {
          userId: { type: "string", example: "67ca72d999ea40f2abc12345" },
          amount: { type: "number", example: 150 },
          description: {
            type: "string",
            example: "Manual payout credit for completed campus task",
          },
          reference: { type: "string", example: "TASK-PAYOUT-001" },
          status: {
            type: "string",
            enum: ["pending", "completed", "failed"],
            example: "completed",
          },
        },
      },
      UpdateWalletTransactionStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["pending", "completed", "failed"],
            example: "failed",
          },
          failureReason: {
            type: "string",
            example: "Payment settlement failed",
          },
        },
      },
      SuspendUserRequest: {
        type: "object",
        properties: {
          suspensionReason: {
            type: "string",
            example: "Repeated abuse reports from runners",
          },
        },
      },
      ArchiveTaskRequest: {
        type: "object",
        properties: {
          archiveReason: {
            type: "string",
            example: "Fake or abusive task listing",
          },
        },
      },
      UpdateReportStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["open", "reviewed", "resolved", "dismissed"],
            example: "resolved",
          },
          resolutionNote: {
            type: "string",
            example: "Suspended offending user and archived related task",
          },
        },
      },
      AuthResponse: apiResponse(
        {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            accessToken: { type: "string", example: "eyJhbGciOiJI..." },
            refreshToken: { type: "string", example: "eyJhbGciOiJI..." },
          },
        },
        "Authentication successful",
      ),
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Unauthorized request" },
          errors: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      TaskResponse: apiResponse(
        { $ref: "#/components/schemas/Task" },
        "Task fetched successfully",
      ),
      TaskListResponse: apiResponse(
        {
          type: "array",
          items: { $ref: "#/components/schemas/Task" },
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/Task" },
            },
            pagination: {
              type: "object",
            },
            filters: {
              type: "object",
            },
          },
        },
        "Open tasks fetched successfully",
      ),
      WalletBalanceResponse: apiResponse(
        { $ref: "#/components/schemas/WalletBalance" },
        "Wallet balance fetched successfully",
      ),
      WalletTransactionResponse: apiResponse(
        { $ref: "#/components/schemas/WalletTransaction" },
        "Wallet transaction fetched successfully",
      ),
      WalletTransactionListResponse: apiResponse(
        {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/WalletTransaction" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 8 },
                totalPages: { type: "integer", example: 1 },
              },
            },
          },
        },
        "Wallet transactions fetched successfully",
      ),
      ReportResponse: apiResponse(
        { $ref: "#/components/schemas/Report" },
        "Report status updated successfully",
      ),
      ReportListResponse: apiResponse(
        {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/Report" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 8 },
                totalPages: { type: "integer", example: 1 },
              },
            },
            filters: {
              type: "object",
              properties: {
                status: { type: "string", example: "open" },
                entityType: { type: "string", example: "task" },
              },
            },
          },
        },
        "Reported issues fetched successfully",
      ),
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "Backend is healthy",
          },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: {
            description: "Validation error",
          },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login an existing user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "User logged in successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: {
            description: "Invalid credentials",
          },
        },
      },
    },
    "/api/v1/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Access token refreshed",
          },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "User logged out successfully",
          },
        },
      },
    },
    "/api/v1/auth/verify": {
      get: {
        tags: ["Auth"],
        summary: "Verify current session",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Session valid",
          },
        },
      },
    },
    "/api/v1/profile/me": {
      get: {
        tags: ["Profile"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profile fetched successfully",
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
          },
        },
      },
    },
    "/api/v1/profile": {
      get: {
        tags: ["Profile"],
        summary: "List profiles",
        description: "Admin-only route to list users with optional filters.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "role", schema: { type: "string" } },
          { in: "query", name: "verified", schema: { type: "boolean" } },
          { in: "query", name: "active", schema: { type: "boolean" } },
          { in: "query", name: "campusId", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Profiles fetched successfully",
          },
        },
      },
    },
    "/api/v1/profile/{userId}": {
      get: {
        tags: ["Profile"],
        summary: "Get user profile by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "User profile fetched successfully",
          },
          403: { description: "Admin only route" },
          404: { description: "User not found" },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update user profile by admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminUpdateProfileRequest" },
            },
          },
        },
        responses: {
          200: { description: "User profile updated successfully" },
          403: { description: "Admin only route" },
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "Soft delete user profile",
        description: "Admin-only route that deactivates a user and clears refresh token.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "User soft deleted successfully" },
          403: { description: "Admin only route" },
        },
      },
    },
    "/api/v1/profile/{userId}/role": {
      patch: {
        tags: ["Profile"],
        summary: "Update a user's role",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateRoleRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "User role updated successfully",
          },
        },
      },
    },
    "/api/v1/profile/{userId}/verification": {
      patch: {
        tags: ["Profile"],
        summary: "Update verification status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateVerificationRequest" },
            },
          },
        },
        responses: {
          200: { description: "User verification status updated successfully" },
          403: { description: "Admin only route" },
        },
      },
    },
    "/api/v1/profile/{userId}/status": {
      patch: {
        tags: ["Profile"],
        summary: "Activate or deactivate user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateStatusRequest" },
            },
          },
        },
        responses: {
          200: { description: "User active status updated successfully" },
          403: { description: "Admin only route" },
        },
      },
    },
    "/api/v1/tasks/protected-actions": {
      get: {
        tags: ["Tasks"],
        summary: "List role-protected task actions",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Protected task actions fetched successfully",
          },
        },
      },
    },
    "/api/v1/tasks/open": {
      get: {
        tags: ["Tasks"],
        summary: "List all open tasks",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", example: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", example: 20 },
          },
          {
            in: "query",
            name: "sort",
            schema: { type: "string", enum: ["asc", "desc"], example: "desc" },
          },
          {
            in: "query",
            name: "cursor",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Open tasks fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskListResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "Search, filter, sort, and paginate tasks",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "search",
            schema: { type: "string", example: "lab" },
          },
          {
            in: "query",
            name: "campus",
            schema: { type: "string", example: "VIT Bhopal" },
          },
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["open", "accepted", "in_progress", "completed", "cancelled"],
            },
          },
          {
            in: "query",
            name: "transportMode",
            schema: {
              type: "string",
              enum: ["walk", "bike", "car", "public_transport", "other"],
            },
          },
          {
            in: "query",
            name: "sort",
            schema: { type: "string", enum: ["asc", "desc"], example: "desc" },
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", example: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", example: 20 },
          },
          {
            in: "query",
            name: "cursor",
            schema: { type: "string" },
            description: "Optional cursor token for cursor-based pagination; when provided, page is ignored.",
          },
        ],
        responses: {
          200: {
            description: "Tasks fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskFeedResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a new task",
        description: "Non-admin users can create tasks only for campuses included in their admin-managed campus scopes.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTaskRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Task created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" },
              },
            },
          },
          403: {
            description: "Campus access denied for task creation",
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}": {
      get: {
        tags: ["Tasks"],
        summary: "Get task by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "taskId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Task fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}/accept": {
      patch: {
        tags: ["Tasks"],
        summary: "Accept an open task atomically",
        description: "Runners can accept only tasks whose campus matches one of their admin-managed campus scopes.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "taskId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Task accepted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" },
              },
            },
          },
          403: {
            description: "Requester cannot accept their own task or runner lacks campus access",
          },
          409: {
            description: "Task already accepted or not open",
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}/in-progress": {
      patch: {
        tags: ["Tasks"],
        summary: "Mark an accepted task as in progress",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "taskId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Task marked as in progress successfully",
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}/complete": {
      patch: {
        tags: ["Tasks"],
        summary: "Complete an in-progress task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "taskId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Task completed successfully",
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}/cancel": {
      patch: {
        tags: ["Tasks"],
        summary: "Cancel a task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "taskId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CancelTaskRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Task cancelled successfully",
          },
        },
      },
    },
    "/api/v1/wallet/balance": {
      get: {
        tags: ["Wallet"],
        summary: "Get current user's wallet balance",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Wallet balance fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletBalanceResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/wallet/transactions": {
      get: {
        tags: ["Wallet"],
        summary: "Get wallet transaction history",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: { type: "string", enum: ["pending", "completed", "failed"] },
          },
          {
            in: "query",
            name: "type",
            schema: { type: "string", enum: ["credit", "debit"] },
          },
          {
            in: "query",
            name: "userId",
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", example: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", example: 20 },
          },
        ],
        responses: {
          200: {
            description: "Wallet transactions fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletTransactionListResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/wallet/transactions/credit": {
      post: {
        tags: ["Wallet"],
        summary: "Create a wallet credit entry",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWalletTransactionRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Wallet credit transaction created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletTransactionResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/wallet/transactions/debit": {
      post: {
        tags: ["Wallet"],
        summary: "Create a wallet debit entry",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWalletTransactionRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Wallet debit transaction created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletTransactionResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/wallet/transactions/{transactionId}/status": {
      patch: {
        tags: ["Wallet"],
        summary: "Update wallet transaction status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "transactionId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateWalletTransactionStatusRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Wallet transaction status updated successfully",
          },
        },
      },
    },
    "/api/v1/admin/users/{userId}/suspend": {
      patch: {
        tags: ["Admin"],
        summary: "Suspend a user account",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuspendUserRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "User suspended successfully",
          },
        },
      },
    },
    "/api/v1/admin/users/{userId}/campus-scopes": {
      get: {
        tags: ["Admin"],
        summary: "Get admin-managed campus scopes for a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "User campus scopes fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CampusScopesResponse" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Admin"],
        summary: "Replace admin-managed campus scopes for a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "userId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCampusScopesRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "User campus scopes updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CampusScopesResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/admin/tasks/{taskId}/archive": {
      patch: {
        tags: ["Admin"],
        summary: "Archive a task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "taskId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ArchiveTaskRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Task archived successfully",
          },
        },
      },
    },
    "/api/v1/admin/reports": {
      get: {
        tags: ["Admin"],
        summary: "List reported issues",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: { type: "string", enum: ["open", "reviewed", "resolved", "dismissed"] },
          },
          {
            in: "query",
            name: "entityType",
            schema: { type: "string", enum: ["user", "task"] },
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", example: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", example: 20 },
          },
        ],
        responses: {
          200: {
            description: "Reported issues fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReportListResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/admin/reports/{reportId}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Update report moderation status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "reportId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateReportStatusRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Report status updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReportResponse" },
              },
            },
          },
        },
      },
    },
  },
};

export { swaggerDocument };