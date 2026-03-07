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
    role: { type: "string", enum: ["requester", "runner", "admin"] },
    isVerified: { type: "boolean", example: true },
    isActive: { type: "boolean", example: true },
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
    reward: { type: "number", example: 80 },
    status: {
      type: "string",
      enum: ["open", "accepted", "in_progress", "completed", "cancelled"],
      example: "open",
    },
    requestedBy: { $ref: "#/components/schemas/User" },
    assignedRunner: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    acceptedAt: {
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
      "JWT authentication, role-based authorization, profile APIs, task lifecycle APIs, and wallet APIs for Campus Runner.",
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
    { name: "Tasks", description: "Protected task access routes" },
    { name: "Wallet", description: "Wallet balance and ledger routes" },
  ],
  components: {
    securitySchemes: bearerSecurityScheme,
    schemas: {
      User: userSchema,
      Task: taskSchema,
      WalletTransaction: walletTransactionSchema,
      WalletBalance: walletBalanceSchema,
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
      CreateTaskRequest: {
        type: "object",
        required: ["title", "description", "pickupLocation", "dropoffLocation"],
        properties: {
          title: { type: "string", example: "Pick up lab printouts" },
          description: {
            type: "string",
            example: "Collect the printed assignment from Block A and deliver it to Hostel 3.",
          },
          pickupLocation: { type: "string", example: "Academic Block A" },
          dropoffLocation: { type: "string", example: "Hostel 3 Reception" },
          reward: { type: "number", example: 80 },
        },
      },
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
      post: {
        tags: ["Tasks"],
        summary: "Create a new task",
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
          404: {
            description: "Task not found",
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}/accept": {
      patch: {
        tags: ["Tasks"],
        summary: "Accept an open task atomically",
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
            description: "Requester cannot accept their own task",
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
        description:
          "Returns the current user's wallet history. Admins can optionally pass a userId query parameter to inspect another user's ledger.",
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
  },
};

export { swaggerDocument };