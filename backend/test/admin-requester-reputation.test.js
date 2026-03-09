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

const [{ app }, { Dispute }, { Report }, { Task }, { User }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/dispute.model.js"),
  import("../src/models/report.model.js"),
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

const createUser = async ({ fullName, email, role, isVerified = true, isActive = true }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified,
    isActive,
    phoneNumber: "",
    campusId: "main-campus",
    campusName: "Main Campus",
    campusScopes:
      role === "requester"
        ? [
            {
              campusId: "main-campus",
              campusName: "Main Campus",
            },
          ]
        : [],
  });
};

describe("admin requester reputation metrics", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-requester-reputation-tests",
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
      Dispute.deleteMany({}),
      Report.deleteMany({}),
    ]);
  });

  it("returns requester reputation list and detail metrics for admins", async () => {
    const [admin, runner, requesterOne, requesterTwo] = await Promise.all([
      createUser({ fullName: "Admin User", email: "admin@example.com", role: "admin" }),
      createUser({ fullName: "Runner User", email: "runner@example.com", role: "runner" }),
      createUser({ fullName: "Requester One", email: "requester-one@example.com", role: "requester" }),
      createUser({
        fullName: "Requester Two",
        email: "requester-two@example.com",
        role: "requester",
        isVerified: false,
      }),
    ]);

    await Task.insertMany([
      {
        title: "Completed task 1",
        description: "Completed task",
        pickupLocation: "Block A",
        dropoffLocation: "Hostel 1",
        reward: 120,
        requestedBy: requesterOne._id,
        assignedRunner: runner._id,
        status: "completed",
      },
      {
        title: "Completed task 2",
        description: "Completed task",
        pickupLocation: "Block A",
        dropoffLocation: "Hostel 2",
        reward: 100,
        requestedBy: requesterOne._id,
        assignedRunner: runner._id,
        status: "completed",
      },
      {
        title: "Cancelled task",
        description: "Cancelled task",
        pickupLocation: "Block B",
        dropoffLocation: "Hostel 3",
        reward: 80,
        requestedBy: requesterOne._id,
        assignedRunner: runner._id,
        status: "cancelled",
      },
      {
        title: "Archived cancelled task",
        description: "Archived task",
        pickupLocation: "Block C",
        dropoffLocation: "Hostel 4",
        reward: 60,
        requestedBy: requesterOne._id,
        status: "cancelled",
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: "Moderation archive",
        archivedBy: admin._id,
      },
      {
        title: "Requester two open task",
        description: "Open task",
        pickupLocation: "Block D",
        dropoffLocation: "Hostel 5",
        reward: 40,
        requestedBy: requesterTwo._id,
        status: "open",
      },
    ]);

    await Dispute.insertMany([
      {
        task: new mongoose.Types.ObjectId(),
        openedBy: requesterOne._id,
        openedByRole: "requester",
        reason: "Issue one",
        status: "resolved",
      },
      {
        task: new mongoose.Types.ObjectId(),
        openedBy: requesterOne._id,
        openedByRole: "requester",
        reason: "Issue two",
        status: "open",
      },
    ]);

    await Report.insertMany([
      {
        entityType: "task",
        reporter: requesterOne._id,
        reportedTask: new mongoose.Types.ObjectId(),
        reason: "Report one",
        status: "resolved",
        reviewedBy: admin._id,
        reviewedAt: new Date(),
      },
      {
        entityType: "task",
        reporter: requesterOne._id,
        reportedTask: new mongoose.Types.ObjectId(),
        reason: "Report two",
        status: "reviewed",
        reviewedBy: admin._id,
        reviewedAt: new Date(),
      },
      {
        entityType: "user",
        reporter: requesterTwo._id,
        reportedUser: runner._id,
        reason: "Report three",
        status: "open",
      },
    ]);

    const authHeader = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const listResponse = await request(app)
      .get("/api/v1/admin/requesters/reputation?sortBy=trustScore&order=desc")
      .set(authHeader);

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.success, true);
    assert.equal(listResponse.body.data.items.length, 2);
    assert.equal(listResponse.body.data.items[0].requester.id, requesterTwo._id.toString());
    assert.equal(listResponse.body.data.items[1].requester.id, requesterOne._id.toString());
    assert.equal(listResponse.body.data.items[1].metrics.totalTaskCount, 4);
    assert.equal(listResponse.body.data.items[1].metrics.completedTaskCount, 2);
    assert.equal(listResponse.body.data.items[1].metrics.cancelledTaskCount, 2);
    assert.equal(listResponse.body.data.items[1].metrics.archivedTaskCount, 1);
    assert.equal(listResponse.body.data.items[1].metrics.completionRate, 50);
    assert.equal(listResponse.body.data.items[1].metrics.cancellationRate, 50);
    assert.equal(listResponse.body.data.items[1].metrics.disputeCount, 2);
    assert.equal(listResponse.body.data.items[1].metrics.openDisputeCount, 1);
    assert.equal(listResponse.body.data.items[1].metrics.reportCount, 2);
    assert.equal(listResponse.body.data.items[1].metrics.reviewedReportCount, 2);
    assert.equal(listResponse.body.data.items[1].metrics.moderationIncidentCount, 3);
    assert.equal(listResponse.body.data.items[1].metrics.trustScore, 45);

    const detailResponse = await request(app)
      .get(`/api/v1/admin/requesters/${requesterOne._id}/reputation`)
      .set(authHeader);

    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.success, true);
    assert.equal(detailResponse.body.data.requester.id, requesterOne._id.toString());
    assert.equal(detailResponse.body.data.metrics.totalTaskCount, 4);
    assert.equal(detailResponse.body.data.metrics.trustScore, 45);
  });
});