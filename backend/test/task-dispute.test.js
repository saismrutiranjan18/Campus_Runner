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

const [{ app }, { Task }, { User }, { Dispute }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/task.model.js"),
  import("../src/models/user.model.js"),
  import("../src/models/dispute.model.js"),
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
  });
};

describe("task disputes", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-dispute-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Task.deleteMany({}), Dispute.deleteMany({})]);
  });

  it("allows a task participant to open a dispute and lets an admin resolve it", async () => {
    const requester = await createUser({
      fullName: "Requester",
      email: "dispute-requester@example.com",
      role: "requester",
    });
    const runner = await createUser({
      fullName: "Runner",
      email: "dispute-runner@example.com",
      role: "runner",
    });
    const admin = await createUser({
      fullName: "Admin",
      email: "dispute-admin@example.com",
      role: "admin",
    });

    const task = await Task.create({
      title: "Collect notes",
      description: "Pick up printed notes and deliver to hostel",
      pickupLocation: "Library",
      dropoffLocation: "Hostel 2",
      reward: 50,
      requestedBy: requester._id,
      assignedRunner: runner._id,
      status: "completed",
      acceptedAt: new Date("2026-03-08T10:00:00.000Z"),
      startedAt: new Date("2026-03-08T10:10:00.000Z"),
      completedAt: new Date("2026-03-08T10:40:00.000Z"),
    });

    const createResponse = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${createAccessToken(requester)}`)
      .send({
        taskId: task._id.toString(),
        reason: "Task outcome mismatch",
        details: "The delivery was marked complete but items were missing.",
        evidence: [
          {
            type: "image",
            label: "Photo proof",
            url: "https://example.com/proof.png",
            note: "Photo taken after delivery",
          },
        ],
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.success, true);
    assert.equal(createResponse.body.data.status, "open");
    assert.equal(createResponse.body.data.openedByRole, "requester");
    assert.equal(createResponse.body.data.evidence.length, 1);

    const adminListResponse = await request(app)
      .get("/api/v1/disputes")
      .set("Authorization", `Bearer ${createAccessToken(admin)}`);

    assert.equal(adminListResponse.status, 200);
    assert.equal(adminListResponse.body.data.items.length, 1);

    const disputeId = createResponse.body.data.id;
    const resolveResponse = await request(app)
      .patch(`/api/v1/disputes/${disputeId}/status`)
      .set("Authorization", `Bearer ${createAccessToken(admin)}`)
      .send({
        status: "resolved",
        resolutionNote: "Reviewed the evidence and marked the dispute resolved.",
      });

    assert.equal(resolveResponse.status, 200);
    assert.equal(resolveResponse.body.data.status, "resolved");
    assert.ok(resolveResponse.body.data.reviewedAt);
    assert.equal(resolveResponse.body.data.reviewedBy.id, admin._id.toString());
  });

  it("rejects disputes from non-participants, disallows in-progress disputes, and blocks duplicates", async () => {
    const requester = await createUser({
      fullName: "Requester Two",
      email: "dispute-requester-two@example.com",
      role: "requester",
    });
    const runner = await createUser({
      fullName: "Runner Two",
      email: "dispute-runner-two@example.com",
      role: "runner",
    });
    const outsider = await createUser({
      fullName: "Runner Outsider",
      email: "dispute-outsider@example.com",
      role: "runner",
    });

    const inProgressTask = await Task.create({
      title: "In progress task",
      description: "This should not allow disputes yet",
      pickupLocation: "Cafe",
      dropoffLocation: "Lab",
      reward: 30,
      requestedBy: requester._id,
      assignedRunner: runner._id,
      status: "in_progress",
      acceptedAt: new Date("2026-03-08T09:00:00.000Z"),
      startedAt: new Date("2026-03-08T09:15:00.000Z"),
    });

    const earlyDisputeResponse = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${createAccessToken(runner)}`)
      .send({
        taskId: inProgressTask._id.toString(),
        reason: "Too early",
      });

    assert.equal(earlyDisputeResponse.status, 409);

    const cancelledTask = await Task.create({
      title: "Cancelled task",
      description: "Task later cancelled",
      pickupLocation: "Gate 1",
      dropoffLocation: "Block D",
      reward: 60,
      requestedBy: requester._id,
      assignedRunner: runner._id,
      status: "cancelled",
      cancelledAt: new Date("2026-03-08T11:00:00.000Z"),
      cancellationReason: "Requester cancelled",
    });

    const outsiderDisputeResponse = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${createAccessToken(outsider)}`)
      .send({
        taskId: cancelledTask._id.toString(),
        reason: "I was not involved",
      });

    assert.equal(outsiderDisputeResponse.status, 403);

    const firstRunnerDispute = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${createAccessToken(runner)}`)
      .send({
        taskId: cancelledTask._id.toString(),
        reason: "Cancellation affected payout",
      });

    assert.equal(firstRunnerDispute.status, 201);

    const duplicateDispute = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${createAccessToken(runner)}`)
      .send({
        taskId: cancelledTask._id.toString(),
        reason: "Trying to open again",
      });

    assert.equal(duplicateDispute.status, 409);
  });
});