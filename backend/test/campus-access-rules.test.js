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

const [{ app }, { Task }, { User }] = await Promise.all([
  import("../src/app.js"),
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

describe("campus-specific access rules", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-campus-access-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Task.deleteMany({})]);
  });

  it("lets admins manage campus scopes and enforces them for task create and accept", async () => {
    const [admin, requester, runnerAllowed, runnerDenied] = await Promise.all([
      createUser({
        fullName: "Admin User",
        email: "admin-campus@example.com",
        role: "admin",
      }),
      createUser({
        fullName: "Scoped Requester",
        email: "requester-campus@example.com",
        role: "requester",
      }),
      createUser({
        fullName: "Scoped Runner",
        email: "runner-allowed@example.com",
        role: "runner",
      }),
      createUser({
        fullName: "Denied Runner",
        email: "runner-denied@example.com",
        role: "runner",
      }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAllowedAuth = { Authorization: `Bearer ${createAccessToken(runnerAllowed)}` };
    const runnerDeniedAuth = { Authorization: `Bearer ${createAccessToken(runnerDenied)}` };

    const requesterScopeResponse = await request(app)
      .put(`/api/v1/admin/users/${requester._id}/campus-scopes`)
      .set(adminAuth)
      .send({
        campusScopes: [{ campusId: "north-campus", campusName: "North Campus" }],
      });

    assert.equal(requesterScopeResponse.status, 200);
    assert.equal(requesterScopeResponse.body.data.campusScopes.length, 1);
    assert.equal(requesterScopeResponse.body.data.campusScopes[0].campusId, "north-campus");

    const runnerScopeResponse = await request(app)
      .put(`/api/v1/admin/users/${runnerAllowed._id}/campus-scopes`)
      .set(adminAuth)
      .send({
        campusScopes: [{ campusId: "north-campus", campusName: "North Campus" }],
      });

    assert.equal(runnerScopeResponse.status, 200);

    const getScopesResponse = await request(app)
      .get(`/api/v1/admin/users/${requester._id}/campus-scopes`)
      .set(adminAuth);

    assert.equal(getScopesResponse.status, 200);
    assert.equal(getScopesResponse.body.data.campusScopes.length, 1);

    const blockedCreateResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Blocked south campus task",
        description: "Should be denied",
        pickupLocation: "South Block",
        dropoffLocation: "South Library",
        campus: "South Campus",
        reward: 50,
      });

    assert.equal(blockedCreateResponse.status, 403);
    assert.match(blockedCreateResponse.body.message, /do not have campus access/i);

    const createResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "North campus delivery",
        description: "Create task within approved campus",
        pickupLocation: "North Gate",
        dropoffLocation: "North Hostel",
        campus: "North Campus",
        reward: 80,
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.campus, "North Campus");

    const deniedAcceptResponse = await request(app)
      .patch(`/api/v1/tasks/${createResponse.body.data.id}/accept`)
      .set(runnerDeniedAuth);

    assert.equal(deniedAcceptResponse.status, 403);
    assert.match(deniedAcceptResponse.body.message, /do not have campus access/i);

    const allowedAcceptResponse = await request(app)
      .patch(`/api/v1/tasks/${createResponse.body.data.id}/accept`)
      .set(runnerAllowedAuth);

    assert.equal(allowedAcceptResponse.status, 200);
    assert.equal(allowedAcceptResponse.body.data.status, "accepted");
    assert.equal(allowedAcceptResponse.body.data.assignedRunner.id, runnerAllowed._id.toString());
  });
});