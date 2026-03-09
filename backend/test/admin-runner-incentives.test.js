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

const [
  { app },
  { RunnerIncentiveRule },
  { Task },
  { User },
  { WalletTransaction },
] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/runnerIncentiveRule.model.js"),
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

describe("admin runner incentive rules", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-incentive-tests",
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
      RunnerIncentiveRule.deleteMany({}),
      User.deleteMany({}),
      Task.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });

  it("creates weekly incentive payouts and prevents duplicate payouts for the same rule window", async () => {
    const admin = await createUser({
      fullName: "Admin User",
      email: "admin-incentives@example.com",
      role: "admin",
    });
    const requester = await createUser({
      fullName: "Requester User",
      email: "requester-incentives@example.com",
      role: "requester",
    });
    const runnerOne = await createUser({
      fullName: "Reliable Runner",
      email: "runner-one-incentives@example.com",
      role: "runner",
    });
    const runnerTwo = await createUser({
      fullName: "Struggling Runner",
      email: "runner-two-incentives@example.com",
      role: "runner",
    });

    const windowStart = new Date("2026-03-02T00:00:00.000Z");
    const windowEnd = new Date("2026-03-09T00:00:00.000Z");

    await Task.insertMany([
      {
        title: "North zone errand 1",
        description: "Reliable runner completed first zone task",
        pickupLocation: "Block A",
        dropoffLocation: "Hostel 1",
        campus: "Main Campus",
        campusZone: "north-zone",
        reward: 120,
        requestedBy: requester._id,
        assignedRunner: runnerOne._id,
        status: "completed",
        acceptedAt: new Date("2026-03-03T08:00:00.000Z"),
        completedAt: new Date("2026-03-03T08:30:00.000Z"),
      },
      {
        title: "North zone errand 2",
        description: "Reliable runner completed second zone task",
        pickupLocation: "Block B",
        dropoffLocation: "Hostel 2",
        campus: "Main Campus",
        campusZone: "north-zone",
        reward: 140,
        requestedBy: requester._id,
        assignedRunner: runnerOne._id,
        status: "completed",
        acceptedAt: new Date("2026-03-04T10:00:00.000Z"),
        completedAt: new Date("2026-03-04T10:20:00.000Z"),
      },
      {
        title: "Runner two completed",
        description: "Second runner completed one task",
        pickupLocation: "Block C",
        dropoffLocation: "Library",
        campus: "Main Campus",
        campusZone: "north-zone",
        reward: 80,
        requestedBy: requester._id,
        assignedRunner: runnerTwo._id,
        status: "completed",
        acceptedAt: new Date("2026-03-05T09:00:00.000Z"),
        completedAt: new Date("2026-03-05T09:25:00.000Z"),
      },
      {
        title: "Runner two cancelled",
        description: "Second runner cancelled one task",
        pickupLocation: "Block D",
        dropoffLocation: "Hostel 3",
        campus: "Main Campus",
        campusZone: "south-zone",
        reward: 60,
        requestedBy: requester._id,
        assignedRunner: runnerTwo._id,
        status: "cancelled",
        acceptedAt: new Date("2026-03-06T11:00:00.000Z"),
        cancelledAt: new Date("2026-03-06T11:15:00.000Z"),
      },
      {
        title: "Outside window task",
        description: "Should not count toward weekly incentive",
        pickupLocation: "Block E",
        dropoffLocation: "Hostel 4",
        campus: "Main Campus",
        campusZone: "north-zone",
        reward: 100,
        requestedBy: requester._id,
        assignedRunner: runnerOne._id,
        status: "completed",
        acceptedAt: new Date("2026-03-10T09:00:00.000Z"),
        completedAt: new Date("2026-03-10T09:15:00.000Z"),
      },
    ]);

    const authHeader = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const taskCountRuleResponse = await request(app)
      .post("/api/v1/admin/runner-incentives/rules")
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-rule-task-count")
      .send({
        code: "weekly-2",
        name: "Weekly Task Finisher",
        description: "Reward runners who complete at least two tasks in a week",
        type: "task_count",
        rewardAmount: 300,
        minimumCompletedTasks: 2,
      });

    assert.equal(taskCountRuleResponse.status, 201);
    assert.equal(taskCountRuleResponse.body.data.code, "WEEKLY-2");

    const completionRateRuleResponse = await request(app)
      .post("/api/v1/admin/runner-incentives/rules")
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-rule-completion-rate")
      .send({
        code: "reliable-95",
        name: "Reliable Runner Bonus",
        type: "completion_rate",
        rewardAmount: 150,
        minimumCompletedTasks: 2,
        minimumCompletionRate: 95,
      });

    assert.equal(completionRateRuleResponse.status, 201);

    const campusZoneRuleResponse = await request(app)
      .post("/api/v1/admin/runner-incentives/rules")
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-rule-campus-zone")
      .send({
        code: "north-zone-2",
        name: "North Zone Sprint",
        type: "campus_zone",
        rewardAmount: 120,
        minimumCompletedTasks: 2,
        campusZones: ["north-zone", "north-zone"],
      });

    assert.equal(campusZoneRuleResponse.status, 201);

    const updatedCampusZoneRuleResponse = await request(app)
      .patch(
        `/api/v1/admin/runner-incentives/rules/${campusZoneRuleResponse.body.data.id}`,
      )
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-rule-campus-zone-update")
      .send({
        rewardAmount: 125,
        description: "Higher reward for high-demand north zone work",
      });

    assert.equal(updatedCampusZoneRuleResponse.status, 200);
    assert.equal(updatedCampusZoneRuleResponse.body.data.rewardAmount, 125);

    const listRulesResponse = await request(app)
      .get("/api/v1/admin/runner-incentives/rules")
      .set(authHeader);

    assert.equal(listRulesResponse.status, 200);
    assert.equal(listRulesResponse.body.data.items.length, 3);

    const previewResponse = await request(app)
      .post("/api/v1/admin/runner-incentives/evaluate")
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-preview")
      .send({
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        previewOnly: true,
      });

    assert.equal(previewResponse.status, 200);
    assert.equal(previewResponse.body.data.summary.totalRules, 3);
    assert.equal(previewResponse.body.data.summary.eligiblePayoutCount, 3);
    assert.equal(previewResponse.body.data.summary.createdPayoutCount, 0);
    assert.equal(previewResponse.body.data.items.length, 3);

    const evaluateResponse = await request(app)
      .post("/api/v1/admin/runner-incentives/evaluate")
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-evaluate")
      .send({
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
      });

    assert.equal(evaluateResponse.status, 200);
    assert.equal(evaluateResponse.body.data.summary.eligiblePayoutCount, 3);
    assert.equal(evaluateResponse.body.data.summary.createdPayoutCount, 3);
    assert.equal(evaluateResponse.body.data.summary.skippedExistingPayoutCount, 0);
    assert.equal(evaluateResponse.body.data.summary.totalPayoutAmount, 575);

    const createdTransactions = await WalletTransaction.find({
      category: "runner_incentive",
    }).lean();

    assert.equal(createdTransactions.length, 3);
    assert.ok(createdTransactions.every((transaction) => transaction.user.toString() === runnerOne._id.toString()));
    assert.ok(createdTransactions.every((transaction) => transaction.incentiveRule));
    assert.ok(createdTransactions.every((transaction) => transaction.incentiveWindowStart));
    assert.ok(createdTransactions.every((transaction) => transaction.incentiveWindowEnd));
    assert.ok(createdTransactions.every((transaction) => transaction.incentiveMetrics));

    const walletListResponse = await request(app)
      .get(
        `/api/v1/wallet/transactions?category=runner_incentive&userId=${runnerOne._id.toString()}`,
      )
      .set(authHeader);

    assert.equal(walletListResponse.status, 200);
    assert.equal(walletListResponse.body.data.items.length, 3);
    assert.equal(walletListResponse.body.data.items[0].category, "runner_incentive");
    assert.ok(walletListResponse.body.data.items[0].incentiveRule);
    assert.ok(walletListResponse.body.data.items[0].incentiveWindowStart);
    assert.ok(walletListResponse.body.data.items[0].incentiveMetrics);

    const secondEvaluateResponse = await request(app)
      .post("/api/v1/admin/runner-incentives/evaluate")
      .set(authHeader)
      .set("Idempotency-Key", "runner-incentive-evaluate-repeat")
      .send({
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
      });

    assert.equal(secondEvaluateResponse.status, 200);
    assert.equal(secondEvaluateResponse.body.data.summary.createdPayoutCount, 0);
    assert.equal(secondEvaluateResponse.body.data.summary.skippedExistingPayoutCount, 3);

    const transactionsAfterRetry = await WalletTransaction.find({
      category: "runner_incentive",
    }).lean();

    assert.equal(transactionsAfterRetry.length, 3);
  });
});