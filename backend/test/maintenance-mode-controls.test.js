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

const [{ app }, { MaintenanceSetting }, { User }, { WalletTransaction }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/maintenanceSetting.model.js"),
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
    campusScopes: [
      {
        campusId: "main-campus",
        campusName: "Main Campus",
      },
    ],
  });
};

describe("maintenance mode controls", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-maintenance-mode-tests",
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
      MaintenanceSetting.deleteMany({}),
      User.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });

  it("lets admins manage maintenance gates and blocks new registrations, task creation, and wallet mutations", async () => {
    const [admin, requester, runner] = await Promise.all([
      createUser({ fullName: "Admin Maintenance", email: "admin-maintenance@example.com", role: "admin" }),
      createUser({ fullName: "Requester Maintenance", email: "requester-maintenance@example.com", role: "requester" }),
      createUser({ fullName: "Runner Maintenance", email: "runner-maintenance@example.com", role: "runner" }),
    ]);

    await WalletTransaction.create({
      user: runner._id,
      type: "credit",
      amount: 200,
      status: "completed",
      category: "manual",
      description: "Seed credit",
      reference: "SEED-CREDIT-001",
      initiatedBy: admin._id,
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    const updateSettingsResponse = await request(app)
      .patch("/api/v1/admin/maintenance")
      .set(adminAuth)
      .set("Idempotency-Key", "maintenance-update-001")
      .send({
        registration: {
          enabled: true,
          reason: "Registrations paused during incident response",
        },
        taskCreation: {
          enabled: true,
          reason: "Task creation paused while queue health is restored",
        },
        walletMutations: {
          enabled: true,
          reason: "Wallet writes paused during ledger verification",
        },
      });

    assert.equal(updateSettingsResponse.status, 200);
    assert.equal(updateSettingsResponse.body.data.registration.enabled, true);
    assert.equal(updateSettingsResponse.body.data.taskCreation.enabled, true);
    assert.equal(updateSettingsResponse.body.data.walletMutations.enabled, true);

    const getSettingsResponse = await request(app)
      .get("/api/v1/admin/maintenance")
      .set(adminAuth);

    assert.equal(getSettingsResponse.status, 200);
    assert.equal(getSettingsResponse.body.data.walletMutations.reason, "Wallet writes paused during ledger verification");

    const blockedRegisterResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        fullName: "Blocked User",
        email: "blocked-user@example.com",
        password: "Password123!",
      });

    assert.equal(blockedRegisterResponse.status, 503);
    assert.match(blockedRegisterResponse.body.message, /registrations paused/i);

    const blockedTaskResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Blocked task",
        description: "Blocked due to maintenance",
        pickupLocation: "Main Gate",
        dropoffLocation: "Library",
        campus: "Main Campus",
        reward: 50,
      });

    assert.equal(blockedTaskResponse.status, 503);
    assert.match(blockedTaskResponse.body.message, /task creation paused/i);

    const blockedWalletResponse = await request(app)
      .post("/api/v1/wallet/withdrawals")
      .set(runnerAuth)
      .send({ amount: 40, reference: "WD-MAINT-001" });

    assert.equal(blockedWalletResponse.status, 503);
    assert.match(blockedWalletResponse.body.message, /wallet writes paused/i);
  });

  it("allows unaffected flows when a specific maintenance gate remains disabled", async () => {
    const admin = await createUser({
      fullName: "Admin Partial Maintenance",
      email: "admin-partial-maintenance@example.com",
      role: "admin",
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    await request(app)
      .patch("/api/v1/admin/maintenance")
      .set(adminAuth)
      .set("Idempotency-Key", "maintenance-update-002")
      .send({
        registration: {
          enabled: false,
          reason: "",
        },
        taskCreation: {
          enabled: true,
          reason: "Task creation paused",
        },
      });

    const allowedRegisterResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        fullName: "Allowed User",
        email: "allowed-user@example.com",
        password: "Password123!",
      });

    assert.equal(allowedRegisterResponse.status, 201);
  });
});