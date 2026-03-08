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

const [{ app }, { Task }, { User }, { WalletTransaction }, { Report }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
  import("../src/models/walletTransaction.model.js"),
  import("../src/models/report.model.js"),
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

const createUser = async ({ fullName, email, role, isActive = true }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified: true,
    isActive,
    phoneNumber: "",
    campusId: "",
    campusName: "",
  });
};

const buildUtcDateWithOffset = (baseDate, dayOffset, hour = 9) => {
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + dayOffset,
      hour,
      0,
      0,
      0,
    ),
  );
};

describe("admin analytics dashboard", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-admin-analytics-tests",
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
      Report.deleteMany({}),
    ]);
  });

  it("returns admin counts, rates, trends, and top campuses", async () => {
    const admin = await createUser({
      fullName: "Admin",
      email: "analytics-admin@example.com",
      role: "admin",
    });
    const requester = await createUser({
      fullName: "Requester",
      email: "analytics-requester@example.com",
      role: "requester",
    });
    const activeRunner = await createUser({
      fullName: "Active Runner",
      email: "analytics-runner@example.com",
      role: "runner",
    });
    const inactiveRunner = await createUser({
      fullName: "Inactive Runner",
      email: "analytics-inactive-runner@example.com",
      role: "runner",
      isActive: false,
    });

    const now = new Date();
    const today = buildUtcDateWithOffset(now, 0);
    const yesterday = buildUtcDateWithOffset(now, -1);
    const twoDaysAgo = buildUtcDateWithOffset(now, -2);

    const [openTask, completedTask, cancelledTask, secondCampusTask] = await Task.create([
      {
        title: "Open task",
        description: "Still pending",
        pickupLocation: "Block A",
        dropoffLocation: "Block B",
        campus: "VIT Bhopal",
        reward: 100,
        requestedBy: requester._id,
        status: "open",
        createdAt: today,
        updatedAt: today,
      },
      {
        title: "Completed task",
        description: "Successfully delivered",
        pickupLocation: "Library",
        dropoffLocation: "Hostel",
        campus: "VIT Bhopal",
        reward: 150,
        requestedBy: requester._id,
        assignedRunner: activeRunner._id,
        status: "completed",
        createdAt: yesterday,
        updatedAt: yesterday,
        acceptedAt: yesterday,
        startedAt: yesterday,
        completedAt: yesterday,
      },
      {
        title: "Cancelled task",
        description: "Cancelled by requester",
        pickupLocation: "Cafe",
        dropoffLocation: "Hostel 3",
        campus: "VIT Bhopal",
        reward: 80,
        requestedBy: requester._id,
        assignedRunner: activeRunner._id,
        status: "cancelled",
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
        cancelledAt: twoDaysAgo,
        cancellationReason: "Requester cancelled",
      },
      {
        title: "Second campus task",
        description: "Completed on another campus",
        pickupLocation: "Gate 1",
        dropoffLocation: "Academic Block",
        campus: "IIT Delhi",
        reward: 120,
        requestedBy: requester._id,
        assignedRunner: activeRunner._id,
        status: "completed",
        createdAt: today,
        updatedAt: today,
        acceptedAt: today,
        startedAt: today,
        completedAt: today,
      },
    ]);

    await Task.updateOne(
      { _id: secondCampusTask._id },
      { $set: { isArchived: true, archivedAt: today, archivedBy: admin._id } },
    );

    await WalletTransaction.create([
      {
        user: activeRunner._id,
        type: "credit",
        amount: 150,
        status: "completed",
        description: "Completed payout",
        reference: "PAYOUT-001",
        initiatedBy: admin._id,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
      {
        user: activeRunner._id,
        type: "credit",
        amount: 120,
        status: "completed",
        description: "Completed payout two",
        reference: "PAYOUT-002",
        initiatedBy: admin._id,
        createdAt: today,
        updatedAt: today,
      },
      {
        user: inactiveRunner._id,
        type: "credit",
        amount: 75,
        status: "pending",
        description: "Pending payout",
        reference: "PAYOUT-003",
        initiatedBy: admin._id,
        createdAt: today,
        updatedAt: today,
      },
    ]);

    await Report.create([
      {
        entityType: "task",
        reporter: requester._id,
        reportedTask: completedTask._id,
        reason: "Issue reported",
        details: "Needs review",
        status: "open",
      },
      {
        entityType: "user",
        reporter: activeRunner._id,
        reportedUser: requester._id,
        reason: "Older resolved issue",
        details: "Already handled",
        status: "resolved",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/admin/analytics/dashboard?days=7")
      .set("Authorization", `Bearer ${createAccessToken(admin)}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.window.days, 7);
    assert.equal(response.body.data.overview.totalTasks, 4);
    assert.equal(response.body.data.overview.openTasks, 1);
    assert.equal(response.body.data.overview.completedTasks, 2);
    assert.equal(response.body.data.overview.cancelledTasks, 1);
    assert.equal(response.body.data.overview.archivedTasks, 1);
    assert.equal(response.body.data.overview.activeRunners, 1);
    assert.equal(response.body.data.overview.activeUsers, 3);
    assert.equal(response.body.data.overview.openReports, 1);
    assert.equal(response.body.data.overview.totalWalletPayouts, 270);
    assert.equal(response.body.data.overview.payoutCount, 2);
    assert.equal(response.body.data.rates.cancellationRate, 25);
    assert.equal(response.body.data.rates.completionRate, 50);

    const topCampus = response.body.data.topCampuses[0];
    assert.equal(topCampus.campus, "VIT Bhopal");
    assert.equal(topCampus.taskCount, 3);

    const yesterdayLabel = yesterday.toISOString().slice(0, 10);
    const todayLabel = today.toISOString().slice(0, 10);
    const completionTrend = response.body.data.trends.tasksCompleted.find(
      (entry) => entry.date === yesterdayLabel,
    );
    const payoutTrend = response.body.data.trends.walletPayouts.find(
      (entry) => entry.date === todayLabel,
    );

    assert.equal(completionTrend?.value, 1);
    assert.equal(payoutTrend?.value, 120);
  });
});