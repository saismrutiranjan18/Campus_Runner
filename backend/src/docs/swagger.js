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
    settlementStatus: {
      type: "string",
      enum: ["pending", "settled", "not_required"],
      example: "settled",
    },
    settlementAmount: { type: "number", example: 80 },
    settlementReference: {
      type: "string",
      example: "TASK-SETTLEMENT-67ca72d999ea40f2abc98765",
    },
    settlementTransactionId: {
      anyOf: [{ type: "string" }, { type: "null" }],
      example: "67ca72d999ea40f2abc45678",
    },
    settledAt: {
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
    category: {
      type: "string",
      enum: ["manual", "withdrawal_request"],
      example: "withdrawal_request",
    },
    description: {
      type: "string",
      example: "Manual payout credit for completed campus task",
    },
    reference: { type: "string", example: "TASK-PAYOUT-001" },
    sourceTaskId: {
      anyOf: [{ type: "string" }, { type: "null" }],
      example: "67ca72d999ea40f2abc98765",
    },
    failureReason: { type: "string", example: "Bank transfer rejected" },
    reviewedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    reviewNote: { type: "string", example: "Approved for payout" },
    reviewedBy: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
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
    availableToWithdraw: { type: "number", example: 370 },
    totalCredited: { type: "number", example: 650 },
    totalDebited: { type: "number", example: 230 },
    pendingCredits: { type: "number", example: 100 },
    pendingDebits: { type: "number", example: 50 },
    failedTransactions: { type: "integer", example: 1 },
    transactionCount: { type: "integer", example: 8 },
    currency: { type: "string", example: "INR" },
  },
};

const fraudFlagSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "67ca72d999ea40f2abc00001" },
    flagType: {
      type: "string",
      enum: [
        "repeated_cancellations",
        "wallet_abuse",
        "self_dealing_pattern",
        "unusually_fast_completion",
      ],
      example: "wallet_abuse",
    },
    severity: { type: "string", enum: ["low", "medium", "high"], example: "medium" },
    status: {
      type: "string",
      enum: ["open", "reviewed", "resolved", "dismissed"],
      example: "open",
    },
    title: { type: "string", example: "Repeated failed wallet debits detected" },
    reason: {
      type: "string",
      example: "User accumulated 3 failed debit transactions within the last 7 days.",
    },
    occurrenceCount: { type: "integer", example: 2 },
    metrics: { type: "object" },
    lastDetectedAt: { type: "string", format: "date-time" },
    user: { anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }] },
    secondaryUser: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    task: { anyOf: [{ $ref: "#/components/schemas/Task" }, { type: "null" }] },
    walletTransaction: {
      anyOf: [{ $ref: "#/components/schemas/WalletTransaction" }, { type: "null" }],
    },
    reviewedBy: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    reviewedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
    resolutionNote: { type: "string", example: "Investigating requester behaviour" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
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

const disputeSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "67ca72d999ea40f2abc77777" },
    task: { $ref: "#/components/schemas/Task" },
    openedBy: { $ref: "#/components/schemas/User" },
    openedByRole: {
      type: "string",
      enum: ["requester", "runner"],
      example: "requester",
    },
    reason: { type: "string", example: "Task marked complete with missing items" },
    details: {
      type: "string",
      example: "The runner marked the task as completed but the delivered package was incomplete.",
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", example: "image" },
          label: { type: "string", example: "Delivery photo" },
          url: { type: "string", example: "https://example.com/evidence.png" },
          note: { type: "string", example: "Photo captured after delivery" },
        },
      },
    },
    status: {
      type: "string",
      enum: ["open", "under_review", "resolved", "dismissed"],
      example: "open",
    },
    resolutionNote: {
      type: "string",
      example: "Reviewed with both parties and resolved in favor of the requester.",
    },
    reviewedBy: {
      anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }],
    },
    reviewedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
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
    { name: "Disputes", description: "Task dispute creation and review routes" },
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
      FraudFlag: fraudFlagSchema,
      Report: reportSchema,
      CampusScope: {
        type: "object",
        properties: {
          campusId: { type: "string", example: "north-campus" },
          campusName: { type: "string", example: "North Campus" },
        },
      },
      Dispute: disputeSchema,
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
      UpdateFraudFlagStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["open", "reviewed", "resolved", "dismissed"],
            example: "reviewed",
          },
          resolutionNote: {
            type: "string",
            example: "Investigating requester behaviour",
          },
      RunnerPerformanceMetrics: {
        type: "object",
        properties: {
          acceptedTaskCount: { type: "integer", example: 12 },
          activeTaskCount: { type: "integer", example: 2 },
          completedTaskCount: { type: "integer", example: 8 },
          cancelledTaskCount: { type: "integer", example: 2 },
          acceptanceRate: {
            type: "number",
            format: "float",
            example: 83.33,
            description:
              "Percentage of accepted assignments that remained active or completed instead of ending in cancellation.",
          },
          completionRate: { type: "number", format: "float", example: 66.67 },
          cancellationRate: { type: "number", format: "float", example: 16.67 },
          averageCompletionTimeMinutes: { type: "number", format: "float", example: 24.5 },
          totalEarnings: { type: "number", example: 1280 },
        },
      },
      RunnerPerformance: {
        type: "object",
        properties: {
          runner: {
            type: "object",
            properties: {
              id: { type: "string", example: "67ca72d999ea40f2abc12345" },
              fullName: { type: "string", example: "Runner One" },
              email: { type: "string", format: "email", example: "runner@example.com" },
              phoneNumber: { type: "string", example: "+91-9876543210" },
              campusId: { type: "string", example: "vit-bhopal" },
              campusName: { type: "string", example: "VIT Bhopal" },
              isVerified: { type: "boolean", example: true },
              isActive: { type: "boolean", example: true },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          metrics: { $ref: "#/components/schemas/RunnerPerformanceMetrics" },
        },
      },
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
                fromDate: { type: "string", example: "2026-03-01" },
                toDate: { type: "string", example: "2026-03-08" },
                archived: { type: "boolean", example: false },
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
      CreateWithdrawalRequest: {
        type: "object",
        required: ["amount"],
        properties: {
          amount: { type: "number", example: 120 },
          reference: { type: "string", example: "WD-20260308-001" },
        },
      },
      ReviewWithdrawalRequest: {
        type: "object",
        properties: {
          failureReason: {
            type: "string",
            example: "Bank account details missing",
          },
          reviewNote: {
            type: "string",
            example: "Please update payout details and resubmit",
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
      CreateDisputeRequest: {
        type: "object",
        required: ["taskId", "reason"],
        properties: {
          taskId: { type: "string", example: "67ca72d999ea40f2abc98765" },
          reason: {
            type: "string",
            example: "Task marked complete with missing items",
          },
          details: {
            type: "string",
            example: "Some items were not delivered even though the task was closed as completed.",
          },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", example: "image" },
                label: { type: "string", example: "Damaged parcel photo" },
                url: { type: "string", example: "https://example.com/dispute-proof.png" },
                note: { type: "string", example: "Photo taken immediately after handoff" },
              },
            },
          },
        },
      },
      UpdateDisputeStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["under_review", "resolved", "dismissed"],
            example: "resolved",
          },
          resolutionNote: {
            type: "string",
            example: "Reviewed the task logs and evidence, then resolved in favor of the requester.",
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
            filters: {
              type: "object",
              properties: {
                status: { type: "string", example: "pending" },
                type: { type: "string", example: "debit" },
                category: { type: "string", example: "withdrawal_request" },
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
      FraudFlagResponse: apiResponse(
        { $ref: "#/components/schemas/FraudFlag" },
        "Fraud flag status updated successfully",
      ),
      FraudFlagListResponse: apiResponse(
      RunnerPerformanceListResponse: apiResponse(
      AdminAnalyticsDashboardResponse: apiResponse(
        {
          type: "object",
          properties: {
            window: {
              type: "object",
              properties: {
                days: { type: "integer", example: 7 },
                startDate: { type: "string", format: "date-time" },
                endDateExclusive: { type: "string", format: "date-time" },
              },
            },
            overview: {
              type: "object",
              properties: {
                totalTasks: { type: "integer", example: 42 },
                openTasks: { type: "integer", example: 8 },
                completedTasks: { type: "integer", example: 24 },
                cancelledTasks: { type: "integer", example: 6 },
                archivedTasks: { type: "integer", example: 2 },
                activeRunners: { type: "integer", example: 15 },
                activeUsers: { type: "integer", example: 72 },
                openReports: { type: "integer", example: 3 },
                totalWalletPayouts: { type: "number", example: 3250 },
                payoutCount: { type: "integer", example: 24 },
              },
            },
            rates: {
              type: "object",
              properties: {
                cancellationRate: { type: "number", example: 14.29 },
                completionRate: { type: "number", example: 57.14 },
              },
            },
            trends: {
              type: "object",
              properties: {
                tasksCreated: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", example: "2026-03-08" },
                      value: { type: "integer", example: 4 },
                    },
                  },
                },
                tasksCompleted: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", example: "2026-03-08" },
                      value: { type: "integer", example: 2 },
                    },
                  },
                },
                tasksCancelled: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", example: "2026-03-08" },
                      value: { type: "integer", example: 1 },
                    },
                  },
                },
                walletPayouts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", example: "2026-03-08" },
                      value: { type: "number", example: 450 },
                    },
                  },
                },
              },
            },
            topCampuses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  campus: { type: "string", example: "VIT Bhopal" },
                  taskCount: { type: "integer", example: 12 },
                  openCount: { type: "integer", example: 3 },
                  completedCount: { type: "integer", example: 7 },
                  cancelledCount: { type: "integer", example: 2 },
                },
              },
            },
          },
        },
        "Admin analytics dashboard fetched successfully",
      DisputeResponse: apiResponse(
        { $ref: "#/components/schemas/Dispute" },
        "Dispute fetched successfully",
      ),
      DisputeListResponse: apiResponse(
        {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/FraudFlag" },
              items: { $ref: "#/components/schemas/RunnerPerformance" },
              items: { $ref: "#/components/schemas/Dispute" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 4 },
                total: { type: "integer", example: 12 },
                total: { type: "integer", example: 2 },
                totalPages: { type: "integer", example: 1 },
              },
            },
            filters: {
              type: "object",
              properties: {
                search: { type: "string", example: "runner" },
                active: { type: "string", example: "true" },
                verified: { type: "string", example: "true" },
                campusId: { type: "string", example: "vit-bhopal" },
                sortBy: { type: "string", example: "totalEarnings" },
                order: { type: "string", example: "desc" },
              },
            },
          },
        },
        "Runner performance metrics fetched successfully",
      ),
      RunnerPerformanceResponse: apiResponse(
        {
          type: "object",
          properties: {
            runner: {
              type: "object",
              properties: {
                id: { type: "string", example: "67ca72d999ea40f2abc12345" },
                fullName: { type: "string", example: "Runner One" },
                email: { type: "string", format: "email", example: "runner@example.com" },
                phoneNumber: { type: "string", example: "+91-9876543210" },
                campusId: { type: "string", example: "vit-bhopal" },
                campusName: { type: "string", example: "VIT Bhopal" },
                role: { type: "string", example: "runner" },
                isVerified: { type: "boolean", example: true },
                isActive: { type: "boolean", example: true },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
            metrics: { $ref: "#/components/schemas/RunnerPerformanceMetrics" },
          },
        },
        "Runner performance metrics fetched successfully",
                status: { type: "string", example: "open" },
                severity: { type: "string", example: "medium" },
                flagType: { type: "string", example: "wallet_abuse" },
              },
            },
          },
        },
        "Fraud flags fetched successfully",
                openedByRole: { type: "string", example: "runner" },
                taskId: { type: "string", example: "67ca72d999ea40f2abc98765" },
              },
            },
          },
        },
        "Disputes fetched successfully",
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
    "/api/v1/tasks/history": {
      get: {
        tags: ["Tasks"],
        summary: "Get requester task history",
        description:
          "Requester-only route that returns the authenticated requester's own tasks with pagination, status filters, created-date filters, and search by title or location fields.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "search",
            schema: { type: "string", example: "library" },
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
            name: "fromDate",
            schema: { type: "string", example: "2026-03-01" },
            description: "Inclusive lower bound for task createdAt. Supports ISO timestamps or YYYY-MM-DD.",
          },
          {
            in: "query",
            name: "toDate",
            schema: { type: "string", example: "2026-03-08" },
            description: "Inclusive upper bound for task createdAt. Supports ISO timestamps or YYYY-MM-DD.",
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
            description: "Requester task history fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskFeedResponse" },
              },
            },
          },
          403: {
            description: "Requester role required",
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
            name: "fromDate",
            schema: { type: "string", example: "2026-03-01" },
          },
          {
            in: "query",
            name: "toDate",
            schema: { type: "string", example: "2026-03-08" },
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
    "/api/v1/disputes/mine": {
      get: {
        tags: ["Disputes"],
        summary: "List disputes opened by the current user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["open", "under_review", "resolved", "dismissed"],
            },
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
            description: "Disputes fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DisputeListResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/disputes": {
      get: {
        tags: ["Disputes"],
        summary: "List all disputes for admin review",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["open", "under_review", "resolved", "dismissed"],
            },
          },
          {
            in: "query",
            name: "openedByRole",
            schema: {
              type: "string",
              enum: ["requester", "runner"],
            },
          },
          {
            in: "query",
            name: "taskId",
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
            description: "Disputes fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DisputeListResponse" },
              },
            },
          },
          403: {
            description: "Admin only route",
          },
        },
      },
      post: {
        tags: ["Disputes"],
        summary: "Open a dispute on a completed or cancelled task",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDisputeRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Dispute opened successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DisputeResponse" },
              },
            },
          },
          409: {
            description: "Task is not eligible for dispute or a duplicate dispute already exists",
          },
        },
      },
    },
    "/api/v1/disputes/{disputeId}": {
      get: {
        tags: ["Disputes"],
        summary: "Get dispute details",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "disputeId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Dispute fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DisputeResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/disputes/{disputeId}/status": {
      patch: {
        tags: ["Disputes"],
        summary: "Update dispute status as admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "disputeId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateDisputeStatusRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Dispute status updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DisputeResponse" },
              },
            },
          },
          403: {
            description: "Admin only route",
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
            name: "category",
            schema: { type: "string", enum: ["manual", "withdrawal_request"] },
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
    "/api/v1/wallet/withdrawals": {
      post: {
        tags: ["Wallet"],
        summary: "Submit a wallet withdrawal request",
        description:
          "Runner-only route that creates a pending withdrawal request after validating available wallet balance against existing pending debits.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWithdrawalRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Wallet withdrawal request submitted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletTransactionResponse" },
              },
            },
          },
          400: {
            description: "Insufficient available balance or invalid request",
          },
          403: {
            description: "Runner role required",
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
    "/api/v1/wallet/withdrawals/{transactionId}/approve": {
      patch: {
        tags: ["Wallet"],
        summary: "Approve a wallet withdrawal request",
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
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewWithdrawalRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Wallet withdrawal request approved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletTransactionResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/wallet/withdrawals/{transactionId}/reject": {
      patch: {
        tags: ["Wallet"],
        summary: "Reject a wallet withdrawal request",
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
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewWithdrawalRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Wallet withdrawal request rejected successfully",
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
    "/api/v1/admin/analytics/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "Get admin analytics dashboard metrics",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "days",
            schema: { type: "integer", example: 7 },
            description: "Number of trailing days to include in trend metrics, between 1 and 90.",
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
            description: "Admin analytics dashboard fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminAnalyticsDashboardResponse" },
              },
            },
          },
          403: {
            description: "Admin only route",
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
    "/api/v1/admin/fraud-flags": {
      get: {
        tags: ["Admin"],
        summary: "List fraud and anomaly detection flags",
        description:
          "Admin-only route that returns backend-generated suspicious activity flags for task cancellations, wallet abuse, self-dealing patterns, and unusually fast completions.",
    "/api/v1/admin/runners/performance": {
      get: {
        tags: ["Admin"],
        summary: "List runner performance metrics",
        description:
          "Admin-only route that returns backend-calculated runner metrics derived from task outcomes and completed wallet credits.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "status",
            schema: { type: "string", enum: ["open", "reviewed", "resolved", "dismissed"] },
          },
          {
            in: "query",
            name: "severity",
            schema: { type: "string", enum: ["low", "medium", "high"] },
          },
          {
            in: "query",
            name: "flagType",
            schema: {
              type: "string",
              enum: [
                "repeated_cancellations",
                "wallet_abuse",
                "self_dealing_pattern",
                "unusually_fast_completion",
              ],
            },
            name: "search",
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "active",
            schema: { type: "boolean" },
          },
          {
            in: "query",
            name: "verified",
            schema: { type: "boolean" },
          },
          {
            in: "query",
            name: "campusId",
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
            description: "Fraud flags fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FraudFlagListResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/admin/fraud-flags/{flagId}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Update fraud flag review status",
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: [
                "fullName",
                "acceptedTaskCount",
                "activeTaskCount",
                "completedTaskCount",
                "cancelledTaskCount",
                "acceptanceRate",
                "completionRate",
                "cancellationRate",
                "averageCompletionTimeMinutes",
                "totalEarnings",
              ],
            },
          },
          {
            in: "query",
            name: "order",
            schema: { type: "string", enum: ["asc", "desc"] },
          },
        ],
        responses: {
          200: {
            description: "Runner performance metrics fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RunnerPerformanceListResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/admin/runners/{runnerId}/performance": {
      get: {
        tags: ["Admin"],
        summary: "Get runner performance metrics by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "flagId",
            name: "runnerId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateFraudFlagStatusRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Fraud flag status updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FraudFlagResponse" },
              },
            },
          },
        responses: {
          200: {
            description: "Runner performance metrics fetched successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RunnerPerformanceResponse" },
              },
            },
          },
          404: {
            description: "Runner not found",
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