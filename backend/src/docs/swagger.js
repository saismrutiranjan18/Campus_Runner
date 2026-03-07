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
      "JWT authentication, role-based authorization, profile APIs, and protected task placeholder routes for Campus Runner.",
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
  ],
  components: {
    securitySchemes: bearerSecurityScheme,
    schemas: {
      User: userSchema,
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
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
          401: {
            description: "Invalid or missing refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
            content: {
              "application/json": {
                schema: apiResponse(
                  { $ref: "#/components/schemas/User" },
                  "Profile fetched successfully",
                ),
              },
            },
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
          400: {
            description: "Nothing to update",
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
          403: {
            description: "Admin only route",
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
    "/api/v1/tasks": {
      post: {
        tags: ["Tasks"],
        summary: "Create task placeholder",
        description: "Protected route for requester/admin until full task service is implemented.",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Task creation route is protected and ready",
          },
          403: {
            description: "Requester/admin only route",
          },
        },
      },
    },
    "/api/v1/tasks/{taskId}/accept": {
      patch: {
        tags: ["Tasks"],
        summary: "Accept task placeholder",
        description: "Protected route for runner/admin until full task assignment logic is implemented.",
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
            description: "Task acceptance route is protected and ready",
          },
          403: {
            description: "Runner/admin only route",
          },
        },
      },
    },
  },
};

export { swaggerDocument };