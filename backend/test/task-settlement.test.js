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

const [{ app }, { Task }, { User }, { WalletTransaction }, { settleRunnerEarningsForTask }] =
  await Promise.all([
    import("../src/app.js"),
    import("../src/models/task.model.js"),
    import("../src/models/user.model.js"),
    import("../src/models/walletTransaction.model.js"),
    import("../src/services/taskSettlement.service.js"),
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

describe("runner earnings settlement", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-settlement-tests",
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

  it("credits the runner wallet when a task is completed and prevents duplicate settlement", async () => {
    const requester = await createUser({
      fullName: "Requester",
      email: "settlement-requester@example.com",
      role: "requester",
    });
    const runner = await createUser({
      fullName: "Runner",
      email: "settlement-runner@example.com",
      role: "runner",
    });

    const task = await Task.create({
      title: "Deliver package",
      description: "Take parcel to hostel reception",
      pickupLocation: "Block C",
      dropoffLocation: "Hostel Reception",
      reward: 175,
      requestedBy: requester._id,
      assignedRunner: runner._id,
      status: "in_progress",
      acceptedAt: new Date("2026-03-08T11:00:00.000Z"),
      startedAt: new Date("2026-03-08T11:15:00.000Z"),
    });

    const completeResponse = await request(app)
      .patch(`/api/v1/tasks/${task._id}/complete`)
      .set("Authorization", `Bearer ${createAccessToken(runner)}`);

    assert.equal(completeResponse.status, 200);
    assert.equal(completeResponse.body.success, true);
    assert.equal(completeResponse.body.data.status, "completed");
    assert.equal(completeResponse.body.data.settlementStatus, "settled");
    assert.equal(completeResponse.body.data.settlementAmount, 175);
    assert.match(completeResponse.body.data.settlementReference, /^TASK-SETTLEMENT-/);
    assert.ok(completeResponse.body.data.settledAt);

    const transactionsAfterCompletion = await WalletTransaction.find({
      sourceTask: task._id,
      type: "credit",
    }).lean();

    assert.equal(transactionsAfterCompletion.length, 1);
    assert.equal(transactionsAfterCompletion[0].user.toString(), runner._id.toString());
    assert.equal(transactionsAfterCompletion[0].amount, 175);
    assert.equal(transactionsAfterCompletion[0].status, "completed");

    const secondSettlement = await settleRunnerEarningsForTask({
      taskId: task._id,
      initiatedBy: runner._id,
    });

    const transactionsAfterRetry = await WalletTransaction.find({
      sourceTask: task._id,
      type: "credit",
    }).lean();
    const updatedTask = await Task.findById(task._id).lean();

    assert.equal(secondSettlement.created, false);
    assert.equal(transactionsAfterRetry.length, 1);
    assert.equal(updatedTask.settlementStatus, "settled");
    assert.equal(updatedTask.settlementAmount, 175);
    assert.ok(updatedTask.settlementTransaction);
  });
});