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

const [{ app }, { User }, { WalletTransaction }] = await Promise.all([
  import("../src/app.js"),
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

const createFailedWithdrawal = async ({ adminAuth, runnerAuth, amount = 60, reference = "WD-FAILED-001" }) => {
  const submitResponse = await request(app)
    .post("/api/v1/wallet/withdrawals")
    .set(runnerAuth)
    .send({ amount, reference });

  assert.equal(submitResponse.status, 201);

  const rejectResponse = await request(app)
    .patch(`/api/v1/wallet/withdrawals/${submitResponse.body.data.id}/reject`)
    .set(adminAuth)
    .send({
      failureReason: "Bank account mismatch",
      reviewNote: "Correct the payout details and retry",
    });

  assert.equal(rejectResponse.status, 200);
  assert.equal(rejectResponse.body.data.status, "failed");

  return rejectResponse.body.data;
};

describe("retryable failed payout workflow", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-retryable-failed-payout-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), WalletTransaction.deleteMany({})]);
  });

  it("retries a failed payout by creating a linked pending withdrawal and superseding the original failure", async () => {
    const [admin, runner] = await Promise.all([
      createUser({ fullName: "Admin Retry", email: "admin-retry@example.com", role: "admin" }),
      createUser({ fullName: "Runner Retry", email: "runner-retry@example.com", role: "runner" }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 250,
      status: "completed",
      category: "manual",
      description: "Runner earnings credit",
      reference: "EARN-RETRY-001",
      initiatedBy: admin._id,
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };
    const failedTransaction = await createFailedWithdrawal({ adminAuth, runnerAuth });

    const retryResponse = await request(app)
      .post(`/api/v1/wallet/withdrawals/${failedTransaction.id}/retry`)
      .set(adminAuth)
      .send({ reviewNote: "Retrying payout with corrected bank routing" });

    assert.equal(retryResponse.status, 201);
    assert.equal(retryResponse.body.data.status, "pending");
    assert.equal(retryResponse.body.data.retrySourceTransactionId, failedTransaction.id);

    const originalTransaction = await WalletTransaction.findById(failedTransaction.id).lean();
    assert.equal(originalTransaction.status, "superseded");
    assert.ok(originalTransaction.supersededByTransaction);

    const balanceResponse = await request(app)
      .get("/api/v1/wallet/balance")
      .set(runnerAuth);

    assert.equal(balanceResponse.status, 200);
    assert.equal(balanceResponse.body.data.currentBalance, 250);
    assert.equal(balanceResponse.body.data.pendingDebits, 60);
    assert.equal(balanceResponse.body.data.availableToWithdraw, 190);

    const secondRetryResponse = await request(app)
      .post(`/api/v1/wallet/withdrawals/${failedTransaction.id}/retry`)
      .set(adminAuth)
      .send({ reviewNote: "Should not retry twice" });

    assert.equal(secondRetryResponse.status, 409);
  });

  it("supersedes a failed payout with replacement amount and reference while preserving lineage", async () => {
    const [admin, runner] = await Promise.all([
      createUser({ fullName: "Admin Supersede", email: "admin-supersede@example.com", role: "admin" }),
      createUser({ fullName: "Runner Supersede", email: "runner-supersede@example.com", role: "runner" }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 300,
      status: "completed",
      category: "manual",
      description: "Runner earnings credit",
      reference: "EARN-SUPERSEDE-001",
      initiatedBy: admin._id,
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };
    const failedTransaction = await createFailedWithdrawal({
      adminAuth,
      runnerAuth,
      amount: 80,
      reference: "WD-FAILED-002",
    });

    const supersedeResponse = await request(app)
      .post(`/api/v1/wallet/withdrawals/${failedTransaction.id}/supersede`)
      .set(adminAuth)
      .send({
        amount: 45,
        reference: "WD-REPLACEMENT-002",
        reviewNote: "Reduced payout amount after fee correction",
      });

    assert.equal(supersedeResponse.status, 201);
    assert.equal(supersedeResponse.body.data.status, "pending");
    assert.equal(supersedeResponse.body.data.amount, 45);
    assert.equal(supersedeResponse.body.data.reference, "WD-REPLACEMENT-002");
    assert.equal(supersedeResponse.body.data.retrySourceTransactionId, failedTransaction.id);

    const originalTransaction = await WalletTransaction.findById(failedTransaction.id).lean();
    assert.equal(originalTransaction.status, "superseded");

    const balanceResponse = await request(app)
      .get("/api/v1/wallet/balance")
      .set(runnerAuth);

    assert.equal(balanceResponse.status, 200);
    assert.equal(balanceResponse.body.data.pendingDebits, 45);
    assert.equal(balanceResponse.body.data.availableToWithdraw, 255);
  });

  it("voids a failed payout without creating a replacement transaction", async () => {
    const [admin, runner] = await Promise.all([
      createUser({ fullName: "Admin Void", email: "admin-void@example.com", role: "admin" }),
      createUser({ fullName: "Runner Void", email: "runner-void@example.com", role: "runner" }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 220,
      status: "completed",
      category: "manual",
      description: "Runner earnings credit",
      reference: "EARN-VOID-001",
      initiatedBy: admin._id,
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };
    const failedTransaction = await createFailedWithdrawal({
      adminAuth,
      runnerAuth,
      amount: 70,
      reference: "WD-FAILED-003",
    });

    const voidResponse = await request(app)
      .patch(`/api/v1/wallet/withdrawals/${failedTransaction.id}/void`)
      .set(adminAuth)
      .send({
        voidReason: "Payout request cancelled after compliance review",
        reviewNote: "Do not recreate this payout automatically",
      });

    assert.equal(voidResponse.status, 200);
    assert.equal(voidResponse.body.data.status, "voided");
    assert.equal(voidResponse.body.data.voidReason, "Payout request cancelled after compliance review");

    const transactions = await WalletTransaction.find({ user: runner._id }).lean();
    assert.equal(transactions.length, 2);

    const retryResponse = await request(app)
      .post(`/api/v1/wallet/withdrawals/${failedTransaction.id}/retry`)
      .set(adminAuth)
      .send({ reviewNote: "Retry should not be allowed after void" });

    assert.equal(retryResponse.status, 409);

    const balanceResponse = await request(app)
      .get("/api/v1/wallet/balance")
      .set(runnerAuth);

    assert.equal(balanceResponse.status, 200);
    assert.equal(balanceResponse.body.data.pendingDebits, 0);
    assert.equal(balanceResponse.body.data.availableToWithdraw, 220);
  });
});