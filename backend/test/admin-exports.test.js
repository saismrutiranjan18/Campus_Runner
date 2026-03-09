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

const createUser = async ({
  fullName,
  email,
  role,
  isVerified = true,
  isActive = true,
  campusId = "main-campus",
  campusName = "Main Campus",
}) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified,
    isActive,
    phoneNumber: "",
    campusId,
    campusName,
    campusScopes: [
      {
        campusId,
        campusName,
      },
    ],
  });
};

describe("admin exports", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-admin-exports-tests",
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

  it("exports filtered tasks and reports as JSON", async () => {
    const [admin, requester, runner] = await Promise.all([
      createUser({ fullName: "Admin", email: "admin-export@example.com", role: "admin" }),
      createUser({ fullName: "Requester", email: "requester-export@example.com", role: "requester" }),
      createUser({ fullName: "Runner", email: "runner-export@example.com", role: "runner" }),
    ]);

    const [completedTask, openTask] = await Task.create([
      {
        title: "Completed export task",
        description: "Completed task description",
        pickupLocation: "Library",
        dropoffLocation: "Hostel",
        campus: "main-campus",
        transportMode: "walk",
        reward: 120,
        requestedBy: requester._id,
        assignedRunner: runner._id,
        status: "completed",
        completedAt: new Date(),
      },
      {
        title: "Open export task",
        description: "Open task description",
        pickupLocation: "Gate",
        dropoffLocation: "Block A",
        campus: "north-campus",
        transportMode: "bike",
        reward: 80,
        requestedBy: requester._id,
        status: "open",
      },
    ]);

    await Report.create([
      {
        entityType: "task",
        reporter: requester._id,
        reportedTask: completedTask._id,
        reason: "Late delivery",
        details: "Runner arrived late",
        status: "open",
      },
      {
        entityType: "user",
        reporter: runner._id,
        reportedUser: requester._id,
        reason: "Spam",
        details: "Noise",
        status: "resolved",
      },
    ]);

    const authHeader = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const taskExportResponse = await request(app)
      .get("/api/v1/admin/exports/tasks?format=json&status=completed&campus=main-campus")
      .set(authHeader);

    assert.equal(taskExportResponse.status, 200);
    assert.equal(taskExportResponse.body.success, true);
    assert.equal(taskExportResponse.body.resource, "tasks");
    assert.equal(taskExportResponse.body.count, 1);
    assert.equal(taskExportResponse.body.items[0].id, completedTask._id.toString());
    assert.match(taskExportResponse.headers["content-disposition"], /admin-tasks-export/i);

    const reportExportResponse = await request(app)
      .get("/api/v1/admin/exports/reports?format=json&status=open&entityType=task")
      .set(authHeader);

    assert.equal(reportExportResponse.status, 200);
    assert.equal(reportExportResponse.body.resource, "reports");
    assert.equal(reportExportResponse.body.count, 1);
    assert.equal(reportExportResponse.body.items[0].reportedTask.id, completedTask._id.toString());
    assert.equal(openTask.status, "open");
  });

  it("exports filtered wallet transactions and users as CSV", async () => {
    const [admin, activeRunner, inactiveRunner] = await Promise.all([
      createUser({ fullName: "Admin CSV", email: "admin-csv@example.com", role: "admin" }),
      createUser({ fullName: "Active Runner", email: "active-runner@example.com", role: "runner", campusId: "main-campus", campusName: "Main Campus" }),
      createUser({ fullName: "Inactive Runner", email: "inactive-runner@example.com", role: "runner", isActive: false, campusId: "north-campus", campusName: "North Campus" }),
    ]);

    await WalletTransaction.create([
      {
        user: activeRunner._id,
        type: "credit",
        amount: 150,
        status: "completed",
        category: "manual",
        description: "Completed payout",
        reference: "PAYOUT-001",
        initiatedBy: admin._id,
      },
      {
        user: inactiveRunner._id,
        type: "debit",
        amount: 50,
        status: "failed",
        category: "manual",
        description: "Failed debit",
        reference: "DEBIT-001",
        initiatedBy: admin._id,
        failureReason: "Insufficient balance",
      },
    ]);

    const authHeader = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const walletExportResponse = await request(app)
      .get("/api/v1/admin/exports/wallet-transactions?format=csv&status=completed&type=credit")
      .set(authHeader);

    assert.equal(walletExportResponse.status, 200);
    assert.match(walletExportResponse.headers["content-type"], /text\/csv/);
    assert.match(walletExportResponse.headers["content-disposition"], /admin-wallet-transactions-export/i);
    assert.match(walletExportResponse.text, /Completed payout/);
    assert.doesNotMatch(walletExportResponse.text, /Failed debit/);

    const userExportResponse = await request(app)
      .get("/api/v1/admin/exports/users?format=csv&role=runner&active=true&campusId=main-campus")
      .set(authHeader);

    assert.equal(userExportResponse.status, 200);
    assert.match(userExportResponse.headers["content-type"], /text\/csv/);
    assert.match(userExportResponse.text, /Active Runner/);
    assert.doesNotMatch(userExportResponse.text, /Inactive Runner/);
  });
});