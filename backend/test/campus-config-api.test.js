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

const [{ app }, { CampusConfig }, { Task }, { User }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/campusConfig.model.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
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
    campusId: "",
    campusName: "",
    campusScopes: [],
  });
};

describe("campus config api", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-campus-config-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([CampusConfig.deleteMany({}), Task.deleteMany({}), User.deleteMany({})]);
  });

  it("lets admins create and update campus config records and exposes active configs publicly", async () => {
    const admin = await createUser({
      fullName: "Admin Campus Config",
      email: "admin-campus-config@example.com",
      role: "admin",
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const createResponse = await request(app)
      .post("/api/v1/admin/campuses")
      .set(adminAuth)
      .set("Idempotency-Key", "campus-config-create-001")
      .send({
        campusId: "north-campus",
        campusName: "North Campus",
        metadata: {
          shortCode: "NC",
          timezone: "Asia/Kolkata",
          address: "North Avenue",
          tags: ["residential", "main"],
        },
        transportRules: {
          allowedTransportModes: ["walk", "bike"],
          defaultTransportMode: "bike",
        },
        operationalSettings: {
          isTaskCreationEnabled: true,
          isRunnerAcceptanceEnabled: false,
          assignmentExpiryMinutes: 30,
          minTaskReward: 20,
          maxTaskReward: 120,
        },
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.campusId, "north-campus");
    assert.equal(createResponse.body.data.transportRules.defaultTransportMode, "bike");

    const publicListResponse = await request(app).get("/api/v1/campuses");
    assert.equal(publicListResponse.status, 200);
    assert.equal(publicListResponse.body.data.items.length, 1);

    const transportUpdateResponse = await request(app)
      .patch("/api/v1/admin/campuses/north-campus/transport-rules")
      .set(adminAuth)
      .set("Idempotency-Key", "campus-config-transport-001")
      .send({
        transportRules: {
          allowedTransportModes: ["walk", "bike", "public_transport"],
          defaultTransportMode: "public_transport",
        },
      });

    assert.equal(transportUpdateResponse.status, 200);
    assert.equal(
      transportUpdateResponse.body.data.transportRules.defaultTransportMode,
      "public_transport",
    );

    const operationsUpdateResponse = await request(app)
      .patch("/api/v1/admin/campuses/north-campus/operational-settings")
      .set(adminAuth)
      .set("Idempotency-Key", "campus-config-ops-001")
      .send({
        operationalSettings: {
          isRunnerAcceptanceEnabled: true,
          assignmentExpiryMinutes: 45,
          minTaskReward: 25,
          maxTaskReward: 150,
        },
      });

    assert.equal(operationsUpdateResponse.status, 200);
    assert.equal(operationsUpdateResponse.body.data.operationalSettings.assignmentExpiryMinutes, 45);
  });

  it("enforces campus transport and reward rules during task creation and acceptance", async () => {
    const [admin, requester, runner] = await Promise.all([
      createUser({ fullName: "Admin Campus Rule", email: "admin-campus-rule@example.com", role: "admin" }),
      createUser({ fullName: "Requester Campus Rule", email: "requester-campus-rule@example.com", role: "requester" }),
      createUser({ fullName: "Runner Campus Rule", email: "runner-campus-rule@example.com", role: "runner" }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    await request(app)
      .post("/api/v1/admin/campuses")
      .set(adminAuth)
      .set("Idempotency-Key", "campus-config-create-002")
      .send({
        campusId: "north-campus",
        campusName: "North Campus",
        transportRules: {
          allowedTransportModes: ["walk", "bike"],
          defaultTransportMode: "bike",
        },
        operationalSettings: {
          isTaskCreationEnabled: true,
          isRunnerAcceptanceEnabled: false,
          assignmentExpiryMinutes: 30,
          minTaskReward: 30,
          maxTaskReward: 100,
        },
      });

    await request(app)
      .put(`/api/v1/admin/users/${requester._id}/campus-scopes`)
      .set(adminAuth)
      .set("Idempotency-Key", "campus-scope-requester-001")
      .send({
        campusScopes: [{ campusId: "north-campus", campusName: "North Campus" }],
      });

    await request(app)
      .put(`/api/v1/admin/users/${runner._id}/campus-scopes`)
      .set(adminAuth)
      .set("Idempotency-Key", "campus-scope-runner-001")
      .send({
        campusScopes: [{ campusId: "north-campus", campusName: "North Campus" }],
      });

    const invalidTransportResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Invalid transport task",
        description: "Invalid transport task description",
        pickupLocation: "North Gate",
        dropoffLocation: "North Hostel",
        campus: "North Campus",
        transportMode: "car",
        reward: 50,
      });

    assert.equal(invalidTransportResponse.status, 400);
    assert.match(invalidTransportResponse.body.message, /not allowed/i);

    const invalidRewardResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Invalid reward task",
        description: "Invalid reward task description",
        pickupLocation: "North Gate",
        dropoffLocation: "North Hostel",
        campus: "north-campus",
        transportMode: "bike",
        reward: 10,
      });

    assert.equal(invalidRewardResponse.status, 400);
    assert.match(invalidRewardResponse.body.message, /at least 30/i);

    const createTaskResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Valid campus-config task",
        description: "Valid campus-config task description",
        pickupLocation: "North Gate",
        dropoffLocation: "North Hostel",
        campus: "north-campus",
        reward: 60,
      });

    assert.equal(createTaskResponse.status, 201);
    assert.equal(createTaskResponse.body.data.campus, "North Campus");
    assert.equal(createTaskResponse.body.data.transportMode, "bike");

    const blockedAcceptResponse = await request(app)
      .patch(`/api/v1/tasks/${createTaskResponse.body.data.id}/accept`)
      .set(runnerAuth);

    assert.equal(blockedAcceptResponse.status, 403);
    assert.match(blockedAcceptResponse.body.message, /runner acceptance is disabled/i);

    const enableAcceptanceResponse = await request(app)
      .patch("/api/v1/admin/campuses/north-campus/operational-settings")
      .set(adminAuth)
      .set("Idempotency-Key", "campus-config-ops-002")
      .send({
        operationalSettings: {
          isRunnerAcceptanceEnabled: true,
          assignmentExpiryMinutes: 45,
          minTaskReward: 30,
          maxTaskReward: 100,
        },
      });

    assert.equal(enableAcceptanceResponse.status, 200);

    const acceptResponse = await request(app)
      .patch(`/api/v1/tasks/${createTaskResponse.body.data.id}/accept`)
      .set(runnerAuth);

    assert.equal(acceptResponse.status, 200);
    assert.ok(acceptResponse.body.data.assignmentExpiresAt);
  });
});