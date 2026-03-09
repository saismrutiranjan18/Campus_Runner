import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-access-secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";

const [{ app }, { Task }, { User }, { WalletTransaction }, { FraudFlag }, { RateLimitBucket }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
  import("../src/models/walletTransaction.model.js"),
  import("../src/models/fraudFlag.model.js"),
  import("../src/models/rateLimitBucket.model.js"),
]);

const createAccessToken = (user) =>
  jwt.sign(
    {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    },
  );

const createUser = async ({ fullName, email, role }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified: true,
    isActive: true,
    phoneNumber: "",
    campusId: "main-campus",
    campusName: "Main Campus",
    campusScopes: [
      {
        campusId: "main-campus",
        campusName: "Main Campus",
      },
    ],
  });
};

const createTaskForRequester = async (appInstance, authHeader, title) => {
  const response = await request(appInstance)
    .post("/api/v1/tasks")
    .set(authHeader)
    .send({
      title,
      description: `${title} description`,
      pickupLocation: "Academic Block",
      dropoffLocation: "Library",
      campus: "Main Campus",
      reward: 50,
    });

  assert.equal(response.status, 201);
  return response.body.data.id;
};

describe("fraud and anomaly detection flags", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-fraud-flags-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      RateLimitBucket.deleteMany({}),
      User.deleteMany({}),
      Task.deleteMany({}),
      WalletTransaction.deleteMany({}),
      FraudFlag.deleteMany({}),
    ]);
  });

  it("flags suspicious task and wallet patterns and allows admin review", async () => {
    const [admin, requester, runner] = await Promise.all([
      createUser({ fullName: "Admin User", email: "admin@example.com", role: "admin" }),
      createUser({
        fullName: "Requester User",
        email: "requester@example.com",
        role: "requester",
      }),
      createUser({ fullName: "Runner User", email: "runner@example.com", role: "runner" }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTaskForRequester(app, requesterAuth, `Cancelled task ${index}`);
      const cancelResponse = await request(app)
        .patch(`/api/v1/tasks/${taskId}/cancel`)
        .set(requesterAuth)
        .send({ cancellationReason: `Cancellation ${index}` });

      assert.equal(cancelResponse.status, 200);
    }

    await RateLimitBucket.deleteMany({});

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTaskForRequester(app, requesterAuth, `Completed task ${index}`);

      const acceptResponse = await request(app)
        .patch(`/api/v1/tasks/${taskId}/accept`)
        .set(runnerAuth);
      assert.equal(acceptResponse.status, 200);

      const inProgressResponse = await request(app)
        .patch(`/api/v1/tasks/${taskId}/in-progress`)
        .set(runnerAuth);
      assert.equal(inProgressResponse.status, 200);

      const completeResponse = await request(app)
        .patch(`/api/v1/tasks/${taskId}/complete`)
        .set(runnerAuth);
      assert.equal(completeResponse.status, 200);
    }

    for (let index = 0; index < 3; index += 1) {
      const walletResponse = await request(app)
        .post("/api/v1/wallet/transactions/debit")
        .set(adminAuth)
        .send({
          userId: runner._id.toString(),
          amount: 25,
          description: `Failed debit ${index}`,
          reference: `FAIL-${index}`,
          status: "failed",
        });

      assert.equal(walletResponse.status, 201);
    }

    const flagListResponse = await request(app)
      .get("/api/v1/admin/fraud-flags")
      .set(adminAuth);

    assert.equal(flagListResponse.status, 200);
    assert.equal(flagListResponse.body.success, true);
    assert.ok(flagListResponse.body.data.items.length >= 4);

    const flagTypes = flagListResponse.body.data.items.map((item) => item.flagType);
    assert.ok(flagTypes.includes("repeated_cancellations"));
    assert.ok(flagTypes.includes("self_dealing_pattern"));
    assert.ok(flagTypes.includes("unusually_fast_completion"));
    assert.ok(flagTypes.includes("wallet_abuse"));

    const repeatedCancellationFlag = flagListResponse.body.data.items.find(
      (item) => item.flagType === "repeated_cancellations",
    );

    const reviewResponse = await request(app)
      .patch(`/api/v1/admin/fraud-flags/${repeatedCancellationFlag.id}/status`)
      .set(adminAuth)
      .send({ status: "reviewed", resolutionNote: "Investigating requester behaviour" });

    assert.equal(reviewResponse.status, 200);
    assert.equal(reviewResponse.body.data.status, "reviewed");
    assert.equal(reviewResponse.body.data.resolutionNote, "Investigating requester behaviour");

    const filteredResponse = await request(app)
      .get("/api/v1/admin/fraud-flags?flagType=wallet_abuse")
      .set(adminAuth);

    assert.equal(filteredResponse.status, 200);
    assert.equal(filteredResponse.body.data.items.length, 1);
    assert.equal(filteredResponse.body.data.items[0].flagType, "wallet_abuse");
  });
});