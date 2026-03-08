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

const [{ app }, { Task }, { User }, { WalletTransaction }, { FraudFlag }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
  import("../src/models/walletTransaction.model.js"),
  import("../src/models/fraudFlag.model.js"),
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

const createTaskForRequester = async (authHeader, title) => {
  const response = await request(app)
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

describe("cooldown enforcement", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-cooldown-tests",
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
      User.deleteMany({}),
      Task.deleteMany({}),
      WalletTransaction.deleteMany({}),
      FraudFlag.deleteMany({}),
    ]);
  });

  it("blocks requester task creation after repeated cancellations and lets an admin clear the cooldown", async () => {
    const [admin, requester] = await Promise.all([
      createUser({ fullName: "Admin Cooldown", email: "admin-cooldown@example.com", role: "admin" }),
      createUser({
        fullName: "Requester Cooldown",
        email: "requester-cooldown@example.com",
        role: "requester",
      }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTaskForRequester(requesterAuth, `Cancelled task ${index}`);
      const cancelResponse = await request(app)
        .patch(`/api/v1/tasks/${taskId}/cancel`)
        .set(requesterAuth)
        .send({ cancellationReason: `Cancellation ${index}` });

      assert.equal(cancelResponse.status, 200);
    }

    const blockedCreateResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Blocked task",
        description: "Blocked task description",
        pickupLocation: "Academic Block",
        dropoffLocation: "Library",
        campus: "Main Campus",
        reward: 40,
      });

    assert.equal(blockedCreateResponse.status, 429);
    assert.match(blockedCreateResponse.body.message, /cooldown/i);

    const cooldownListResponse = await request(app)
      .get(`/api/v1/admin/users/${requester._id}/cooldowns`)
      .set(adminAuth);

    assert.equal(cooldownListResponse.status, 200);
    assert.equal(cooldownListResponse.body.data.activeCooldowns.length, 2);

    const taskCreationCooldown = cooldownListResponse.body.data.activeCooldowns.find(
      (cooldown) => cooldown.action === "task_creation",
    );

    assert.ok(taskCreationCooldown);

    const clearCooldownResponse = await request(app)
      .patch(`/api/v1/admin/users/${requester._id}/cooldowns/${taskCreationCooldown.id}/clear`)
      .set(adminAuth)
      .send({ clearReason: "Requester verified by admin" });

    assert.equal(clearCooldownResponse.status, 200);
    assert.equal(clearCooldownResponse.body.data.cooldown.clearReason, "Requester verified by admin");
    assert.equal(clearCooldownResponse.body.data.cooldown.isActive, false);

    const allowedCreateResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Allowed task",
        description: "Allowed task description",
        pickupLocation: "Academic Block",
        dropoffLocation: "Library",
        campus: "Main Campus",
        reward: 60,
      });

    assert.equal(allowedCreateResponse.status, 201);
  });

  it("blocks runner withdrawals after repeated failed payout reviews", async () => {
    const [admin, runner] = await Promise.all([
      createUser({ fullName: "Admin Wallet", email: "admin-wallet@example.com", role: "admin" }),
      createUser({ fullName: "Runner Wallet", email: "runner-wallet@example.com", role: "runner" }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 300,
      status: "completed",
      category: "manual",
      description: "Runner earnings credit",
      reference: "EARN-WALLET-001",
      initiatedBy: admin._id,
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    for (let index = 0; index < 3; index += 1) {
      const withdrawalResponse = await request(app)
        .post("/api/v1/wallet/withdrawals")
        .set(runnerAuth)
        .send({ amount: 20, reference: `WD-FAIL-${index}` });

      assert.equal(withdrawalResponse.status, 201);

      const rejectResponse = await request(app)
        .patch(`/api/v1/wallet/withdrawals/${withdrawalResponse.body.data.id}/reject`)
        .set(adminAuth)
        .send({
          failureReason: `Bank reject ${index}`,
          reviewNote: "Retry later",
        });

      assert.equal(rejectResponse.status, 200);
      assert.equal(rejectResponse.body.data.status, "failed");
    }

    const blockedWithdrawalResponse = await request(app)
      .post("/api/v1/wallet/withdrawals")
      .set(runnerAuth)
      .send({ amount: 10, reference: "WD-BLOCKED" });

    assert.equal(blockedWithdrawalResponse.status, 429);
    assert.match(blockedWithdrawalResponse.body.message, /cooldown/i);
  });

  it("blocks runner task acceptance after suspicious fast completions", async () => {
    const [requester, runner] = await Promise.all([
      createUser({ fullName: "Requester Fraud", email: "requester-fraud@example.com", role: "requester" }),
      createUser({ fullName: "Runner Fraud", email: "runner-fraud@example.com", role: "runner" }),
    ]);

    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTaskForRequester(requesterAuth, `Fast completion ${index}`);

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

    const nextTaskId = await createTaskForRequester(requesterAuth, "Blocked acceptance task");
    const blockedAcceptResponse = await request(app)
      .patch(`/api/v1/tasks/${nextTaskId}/accept`)
      .set(runnerAuth);

    assert.equal(blockedAcceptResponse.status, 429);
    assert.match(blockedAcceptResponse.body.message, /cooldown/i);
  });
});