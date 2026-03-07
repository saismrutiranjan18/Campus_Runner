import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";

const [{ reopenExpiredAcceptedTasks }, { Task }, { User }] = await Promise.all([
  import("../src/background/taskExpiry.monitor.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
]);

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
  });
};

describe("task expiry monitor", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-task-expiry-tests",
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

  it("reopens stale accepted tasks and keeps fresh assignments untouched", async () => {
    const requester = await createUser({
      fullName: "Requester",
      email: "expiry-requester@example.com",
      role: "requester",
    });

    const [staleRunner, freshRunner] = await Promise.all([
      createUser({
        fullName: "Stale Runner",
        email: "stale-runner@example.com",
        role: "runner",
      }),
      createUser({
        fullName: "Fresh Runner",
        email: "fresh-runner@example.com",
        role: "runner",
      }),
    ]);

    const now = new Date("2026-03-08T12:00:00.000Z");
    const staleAcceptedAt = new Date(now.getTime() - 16 * 60 * 1000);
    const freshAcceptedAt = new Date(now.getTime() - 5 * 60 * 1000);

    const [staleTask, freshTask] = await Task.create([
      {
        title: "Expired accepted task",
        description: "This task should be reopened",
        pickupLocation: "Block A",
        dropoffLocation: "Block B",
        reward: 100,
        requestedBy: requester._id,
        assignedRunner: staleRunner._id,
        status: "accepted",
        acceptedAt: staleAcceptedAt,
        assignmentExpiresAt: new Date(now.getTime() - 60 * 1000),
      },
      {
        title: "Fresh accepted task",
        description: "This task should remain accepted",
        pickupLocation: "Library",
        dropoffLocation: "Hostel",
        reward: 120,
        requestedBy: requester._id,
        assignedRunner: freshRunner._id,
        status: "accepted",
        acceptedAt: freshAcceptedAt,
        assignmentExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      },
    ]);

    const result = await reopenExpiredAcceptedTasks({
      now,
      acceptanceTimeoutMs: 15 * 60 * 1000,
    });

    assert.equal(result.reopenedCount, 1);

    const [updatedStaleTask, updatedFreshTask] = await Promise.all([
      Task.findById(staleTask._id).lean(),
      Task.findById(freshTask._id).lean(),
    ]);

    assert.ok(updatedStaleTask);
    assert.equal(updatedStaleTask.status, "open");
    assert.equal(updatedStaleTask.assignedRunner, null);
    assert.equal(updatedStaleTask.acceptedAt, null);
    assert.equal(updatedStaleTask.assignmentExpiresAt, null);
    assert.equal(updatedStaleTask.expiryReopenCount, 1);
    assert.equal(updatedStaleTask.reopenedAt?.toISOString(), now.toISOString());
    assert.equal(updatedStaleTask.lastExpiredAt?.toISOString(), now.toISOString());
    assert.match(updatedStaleTask.expirationReason, /expired/i);

    assert.ok(updatedFreshTask);
    assert.equal(updatedFreshTask.status, "accepted");
    assert.equal(updatedFreshTask.assignedRunner?.toString(), freshRunner._id.toString());
    assert.equal(updatedFreshTask.expiryReopenCount, 0);
  });
});