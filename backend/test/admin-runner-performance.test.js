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

describe("admin runner performance metrics", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-tests",
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
    ]);
  });

  it("returns runner performance list and detail metrics for admins", async () => {
    const admin = await createUser({
      fullName: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
    const requester = await createUser({
      fullName: "Requester User",
      email: "requester@example.com",
      role: "requester",
    });
    const [runnerOne, runnerTwo] = await Promise.all([
      createUser({
        fullName: "Runner One",
        email: "runner-one@example.com",
        role: "runner",
      }),
      createUser({
        fullName: "Runner Two",
        email: "runner-two@example.com",
        role: "runner",
      }),
    ]);

    const now = new Date();
    const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    await Task.insertMany([
      {
        title: "Completed errand",
        description: "Deliver completed task",
        pickupLocation: "Block A",
        dropoffLocation: "Hostel 1",
        reward: 120,
        requestedBy: requester._id,
        assignedRunner: runnerOne._id,
        status: "completed",
        acceptedAt: fortyMinutesAgo,
        completedAt: tenMinutesAgo,
      },
      {
        title: "Cancelled errand",
        description: "Cancelled task",
        pickupLocation: "Block B",
        dropoffLocation: "Hostel 2",
        reward: 60,
        requestedBy: requester._id,
        assignedRunner: runnerOne._id,
        status: "cancelled",
        acceptedAt: new Date(now.getTime() - 30 * 60 * 1000),
        cancelledAt: new Date(now.getTime() - 20 * 60 * 1000),
      },
      {
        title: "Active errand",
        description: "Current active task",
        pickupLocation: "Block C",
        dropoffLocation: "Library",
        reward: 80,
        requestedBy: requester._id,
        assignedRunner: runnerOne._id,
        status: "accepted",
        acceptedAt: new Date(now.getTime() - 15 * 60 * 1000),
      },
      {
        title: "Runner two completed",
        description: "Second runner task",
        pickupLocation: "Block D",
        dropoffLocation: "Hostel 3",
        reward: 90,
        requestedBy: requester._id,
        assignedRunner: runnerTwo._id,
        status: "completed",
        acceptedAt: new Date(now.getTime() - 25 * 60 * 1000),
        completedAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
    ]);

    await WalletTransaction.insertMany([
      {
        user: runnerOne._id,
        type: "credit",
        amount: 250,
        status: "completed",
        description: "Runner one payout",
        reference: "RUNNER-ONE-PAYOUT",
        initiatedBy: admin._id,
      },
      {
        user: runnerOne._id,
        type: "credit",
        amount: 100,
        status: "pending",
        description: "Runner one pending payout",
        reference: "RUNNER-ONE-PENDING",
        initiatedBy: admin._id,
      },
      {
        user: runnerTwo._id,
        type: "credit",
        amount: 90,
        status: "completed",
        description: "Runner two payout",
        reference: "RUNNER-TWO-PAYOUT",
        initiatedBy: admin._id,
      },
    ]);

    const authHeader = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const listResponse = await request(app)
      .get("/api/v1/admin/runners/performance?sortBy=totalEarnings&order=desc")
      .set(authHeader);

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.success, true);
    assert.equal(listResponse.body.data.items.length, 2);
    assert.equal(listResponse.body.data.items[0].runner.id, runnerOne._id.toString());
    assert.equal(listResponse.body.data.items[0].metrics.acceptedTaskCount, 3);
    assert.equal(listResponse.body.data.items[0].metrics.activeTaskCount, 1);
    assert.equal(listResponse.body.data.items[0].metrics.completedTaskCount, 1);
    assert.equal(listResponse.body.data.items[0].metrics.cancelledTaskCount, 1);
    assert.equal(listResponse.body.data.items[0].metrics.acceptanceRate, 66.67);
    assert.equal(listResponse.body.data.items[0].metrics.completionRate, 33.33);
    assert.equal(listResponse.body.data.items[0].metrics.cancellationRate, 33.33);
    assert.equal(listResponse.body.data.items[0].metrics.averageCompletionTimeMinutes, 30);
    assert.equal(listResponse.body.data.items[0].metrics.totalEarnings, 250);

    const detailResponse = await request(app)
      .get(`/api/v1/admin/runners/${runnerOne._id}/performance`)
      .set(authHeader);

    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.success, true);
    assert.equal(detailResponse.body.data.runner.id, runnerOne._id.toString());
    assert.equal(detailResponse.body.data.metrics.acceptedTaskCount, 3);
    assert.equal(detailResponse.body.data.metrics.activeTaskCount, 1);
    assert.equal(detailResponse.body.data.metrics.completedTaskCount, 1);
    assert.equal(detailResponse.body.data.metrics.cancelledTaskCount, 1);
    assert.equal(detailResponse.body.data.metrics.acceptanceRate, 66.67);
    assert.equal(detailResponse.body.data.metrics.completionRate, 33.33);
    assert.equal(detailResponse.body.data.metrics.cancellationRate, 33.33);
    assert.equal(detailResponse.body.data.metrics.averageCompletionTimeMinutes, 30);
    assert.equal(detailResponse.body.data.metrics.totalEarnings, 250);
  });
});