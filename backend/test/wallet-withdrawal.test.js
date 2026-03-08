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

describe("wallet withdrawal requests", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-wallet-withdrawal-tests",
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

  it("lets a runner submit and an admin approve a withdrawal request while reserving available funds", async () => {
    const [admin, runner] = await Promise.all([
      createUser({
        fullName: "Admin User",
        email: "admin@example.com",
        role: "admin",
      }),
      createUser({
        fullName: "Runner User",
        email: "runner@example.com",
        role: "runner",
      }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 300,
      status: "completed",
      category: "manual",
      description: "Runner earnings credit",
      reference: "EARN-001",
      initiatedBy: admin._id,
    });

    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };
    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const submitResponse = await request(app)
      .post("/api/v1/wallet/withdrawals")
      .set(runnerAuth)
      .send({ amount: 120, reference: "WD-001" });

    assert.equal(submitResponse.status, 201);
    assert.equal(submitResponse.body.success, true);
    assert.equal(submitResponse.body.data.type, "debit");
    assert.equal(submitResponse.body.data.status, "pending");
    assert.equal(submitResponse.body.data.category, "withdrawal_request");
    assert.equal(submitResponse.body.data.amount, 120);

    const reservedBalanceResponse = await request(app)
      .get("/api/v1/wallet/balance")
      .set(runnerAuth);

    assert.equal(reservedBalanceResponse.status, 200);
    assert.equal(reservedBalanceResponse.body.data.currentBalance, 300);
    assert.equal(reservedBalanceResponse.body.data.pendingDebits, 120);
    assert.equal(reservedBalanceResponse.body.data.availableToWithdraw, 180);

    const insufficientResponse = await request(app)
      .post("/api/v1/wallet/withdrawals")
      .set(runnerAuth)
      .send({ amount: 190, reference: "WD-TOO-LARGE" });

    assert.equal(insufficientResponse.status, 400);
    assert.match(insufficientResponse.body.message, /insufficient available wallet balance/i);

    const adminListResponse = await request(app)
      .get(
        `/api/v1/wallet/transactions?category=withdrawal_request&status=pending&userId=${runner._id}`,
      )
      .set(adminAuth);

    assert.equal(adminListResponse.status, 200);
    assert.equal(adminListResponse.body.data.items.length, 1);
    assert.equal(adminListResponse.body.data.items[0].category, "withdrawal_request");

    const approveResponse = await request(app)
      .patch(`/api/v1/wallet/withdrawals/${submitResponse.body.data.id}/approve`)
      .set(adminAuth)
      .send({ reviewNote: "Approved for payout" });

    assert.equal(approveResponse.status, 200);
    assert.equal(approveResponse.body.success, true);
    assert.equal(approveResponse.body.data.status, "completed");
    assert.equal(approveResponse.body.data.reviewNote, "Approved for payout");
    assert.equal(approveResponse.body.data.reviewedBy.id, admin._id.toString());

    const finalBalanceResponse = await request(app)
      .get("/api/v1/wallet/balance")
      .set(runnerAuth);

    assert.equal(finalBalanceResponse.status, 200);
    assert.equal(finalBalanceResponse.body.data.currentBalance, 180);
    assert.equal(finalBalanceResponse.body.data.pendingDebits, 0);
    assert.equal(finalBalanceResponse.body.data.availableToWithdraw, 180);
  });

  it("lets an admin reject a withdrawal request without reducing completed balance", async () => {
    const [admin, runner] = await Promise.all([
      createUser({
        fullName: "Admin Rejector",
        email: "admin-reject@example.com",
        role: "admin",
      }),
      createUser({
        fullName: "Runner Reject",
        email: "runner-reject@example.com",
        role: "runner",
      }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 200,
      status: "completed",
      category: "manual",
      description: "Runner earnings credit",
      reference: "EARN-002",
      initiatedBy: admin._id,
    });

    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };
    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const submitResponse = await request(app)
      .post("/api/v1/wallet/withdrawals")
      .set(runnerAuth)
      .send({ amount: 50, reference: "WD-REJECT" });

    assert.equal(submitResponse.status, 201);

    const rejectResponse = await request(app)
      .patch(`/api/v1/wallet/withdrawals/${submitResponse.body.data.id}/reject`)
      .set(adminAuth)
      .send({
        failureReason: "Bank account details missing",
        reviewNote: "Please update payout details and resubmit",
      });

    assert.equal(rejectResponse.status, 200);
    assert.equal(rejectResponse.body.data.status, "failed");
    assert.equal(rejectResponse.body.data.failureReason, "Bank account details missing");
    assert.equal(rejectResponse.body.data.reviewNote, "Please update payout details and resubmit");

    const balanceResponse = await request(app)
      .get("/api/v1/wallet/balance")
      .set(runnerAuth);

    assert.equal(balanceResponse.status, 200);
    assert.equal(balanceResponse.body.data.currentBalance, 200);
    assert.equal(balanceResponse.body.data.pendingDebits, 0);
    assert.equal(balanceResponse.body.data.availableToWithdraw, 200);
    assert.equal(balanceResponse.body.data.failedTransactions, 1);
  });
});