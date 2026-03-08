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

const [{ app }, { Task }, { User }, { WalletTransaction }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
  import("../src/models/walletTransaction.model.js"),
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
  });
};

describe("refund and reversal ledger flow", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-refund-ledger-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Task.deleteMany({}), WalletTransaction.deleteMany({})]);
  });

  it("applies a partial dispute refund by crediting the requester and reversing runner earnings", async () => {
    const [requester, runner, admin] = await Promise.all([
      createUser({ fullName: "Requester Refund", email: "requester-refund@example.com", role: "requester" }),
      createUser({ fullName: "Runner Refund", email: "runner-refund@example.com", role: "runner" }),
      createUser({ fullName: "Admin Refund", email: "admin-refund@example.com", role: "admin" }),
    ]);

    const task = await Task.create({
      title: "Settled refundable task",
      description: "Completed task later disputed",
      pickupLocation: "Block A",
      dropoffLocation: "Library",
      reward: 175,
      requestedBy: requester._id,
      assignedRunner: runner._id,
      status: "completed",
      completedAt: new Date(),
      settlementStatus: "settled",
      settlementAmount: 175,
      settlementReference: "TASK-SETTLEMENT-1",
      settledAt: new Date(),
    });

    const settlementTransaction = await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 175,
      status: "completed",
      category: "manual",
      description: "Automatic payout for completed task",
      reference: "TASK-SETTLEMENT-1",
      sourceTask: task._id,
      initiatedBy: admin._id,
    });

    task.settlementTransaction = settlementTransaction._id;
    await task.save();

    const refundResponse = await request(app)
      .patch(`/api/v1/admin/tasks/${task._id}/refund`)
      .set({ Authorization: `Bearer ${createAccessToken(admin)}` })
      .set("Idempotency-Key", "refund-ledger-001")
      .send({
        amount: 75,
        reason: "Partial dispute resolution",
        triggerType: "dispute",
      });

    assert.equal(refundResponse.status, 200);
    assert.equal(refundResponse.body.data.task.refundStatus, "partial");
    assert.equal(refundResponse.body.data.task.refundedAmount, 75);
    assert.ok(refundResponse.body.data.requesterRefundTransactionId);
    assert.ok(refundResponse.body.data.runnerReversalTransactionId);

    const requesterWallet = await request(app)
      .get("/api/v1/wallet/balance")
      .set({ Authorization: `Bearer ${createAccessToken(requester)}` });

    assert.equal(requesterWallet.status, 200);
    assert.equal(requesterWallet.body.data.currentBalance, 75);

    const runnerWallet = await request(app)
      .get("/api/v1/wallet/balance")
      .set({ Authorization: `Bearer ${createAccessToken(runner)}` });

    assert.equal(runnerWallet.status, 200);
    assert.equal(runnerWallet.body.data.currentBalance, 100);
  });

  it("applies a full cancellation refund without creating a runner reversal when the task was never settled", async () => {
    const [requester, admin] = await Promise.all([
      createUser({ fullName: "Requester Cancel", email: "requester-cancel@example.com", role: "requester" }),
      createUser({ fullName: "Admin Cancel", email: "admin-cancel@example.com", role: "admin" }),
    ]);

    const task = await Task.create({
      title: "Cancelled refundable task",
      description: "Cancelled task eligible for full refund",
      pickupLocation: "Block C",
      dropoffLocation: "Hostel",
      reward: 60,
      requestedBy: requester._id,
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: "Requester cancellation",
      settlementStatus: "pending",
    });

    const refundResponse = await request(app)
      .patch(`/api/v1/admin/tasks/${task._id}/refund`)
      .set({ Authorization: `Bearer ${createAccessToken(admin)}` })
      .set("Idempotency-Key", "refund-ledger-002")
      .send({
        triggerType: "cancellation",
        reason: "Full cancellation refund",
      });

    assert.equal(refundResponse.status, 200);
    assert.equal(refundResponse.body.data.task.refundStatus, "full");
    assert.equal(refundResponse.body.data.task.refundedAmount, 60);
    assert.equal(refundResponse.body.data.runnerReversalTransactionId, null);

    const requesterWallet = await request(app)
      .get("/api/v1/wallet/balance")
      .set({ Authorization: `Bearer ${createAccessToken(requester)}` });

    assert.equal(requesterWallet.status, 200);
    assert.equal(requesterWallet.body.data.currentBalance, 60);
  });
});