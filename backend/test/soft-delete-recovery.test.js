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

const createUser = async ({ fullName, email, role, isActive = true }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified: true,
    isActive,
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

describe("soft delete recovery api", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-soft-delete-recovery-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([Task.deleteMany({}), User.deleteMany({})]);
  });

  it("restores a suspended user with recovery audit fields", async () => {
    const [admin, runner] = await Promise.all([
      createUser({ fullName: "Admin User", email: "restore-admin@example.com", role: "admin" }),
      createUser({ fullName: "Runner User", email: "restore-runner@example.com", role: "runner" }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const suspendResponse = await request(app)
      .patch(`/api/v1/admin/users/${runner._id}/suspend`)
      .set(adminAuth)
      .send({ suspensionReason: "Temporary moderation hold" });

    assert.equal(suspendResponse.status, 200);
    assert.equal(suspendResponse.body.data.isActive, false);

    const restoreResponse = await request(app)
      .patch(`/api/v1/admin/users/${runner._id}/restore`)
      .set(adminAuth)
      .send({ restoreReason: "Appeal approved" });

    assert.equal(restoreResponse.status, 200);
    assert.equal(restoreResponse.body.data.isActive, true);
    assert.equal(restoreResponse.body.data.restoreReason, "Appeal approved");
    assert.equal(restoreResponse.body.data.suspendedAt, null);
    assert.ok(restoreResponse.body.data.restoredAt);
  });

  it("restores an archived task to its pre-archive status with recovery audit fields", async () => {
    const [admin, requester] = await Promise.all([
      createUser({ fullName: "Admin Task", email: "restore-task-admin@example.com", role: "admin" }),
      createUser({ fullName: "Requester Task", email: "restore-task-requester@example.com", role: "requester" }),
    ]);

    const task = await Task.create({
      title: "Restore me",
      description: "Task to archive and restore",
      pickupLocation: "Block A",
      dropoffLocation: "Block B",
      campus: "main-campus",
      reward: 40,
      requestedBy: requester._id,
      status: "open",
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const archiveResponse = await request(app)
      .patch(`/api/v1/admin/tasks/${task._id}/archive`)
      .set(adminAuth)
      .send({ archiveReason: "Cleanup archive" });

    assert.equal(archiveResponse.status, 200);
    assert.equal(archiveResponse.body.data.isArchived, true);
    assert.equal(archiveResponse.body.data.status, "cancelled");
    assert.equal(archiveResponse.body.data.archivedStatusSnapshot, "open");

    const restoreResponse = await request(app)
      .patch(`/api/v1/admin/tasks/${task._id}/restore`)
      .set(adminAuth)
      .send({ restoreReason: "Restored after review" });

    assert.equal(restoreResponse.status, 200);
    assert.equal(restoreResponse.body.data.isArchived, false);
    assert.equal(restoreResponse.body.data.status, "open");
    assert.equal(restoreResponse.body.data.restoreReason, "Restored after review");
    assert.equal(restoreResponse.body.data.archivedStatusSnapshot, "");
    assert.equal(restoreResponse.body.data.archivedAt, null);
    assert.ok(restoreResponse.body.data.restoredAt);
  });
});