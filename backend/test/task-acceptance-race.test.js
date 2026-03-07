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
    campusScopes: [{ campusId: "vit-bhopal", campusName: "VIT Bhopal" }],
  });
};

describe("task acceptance concurrency", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-tests",
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

  it("allows only one of two runners to accept the same open task", async () => {
    const requester = await createUser({
      fullName: "Requester One",
      email: "requester@example.com",
      role: "requester",
    });

    const [runnerOne, runnerTwo] = await Promise.all([
      createUser({
        fullName: "Runner One",
        email: "runner-one@example.com",
        role: "runner",
      }),
      createUser({
        fullName: "Runner Two",
        email: "runner-two@example.com",
        role: "runner",
      }),
    ]);

    const task = await Task.create({
      title: "Pick up documents",
      description: "Collect documents from the admin block",
      pickupLocation: "Admin Block",
      dropoffLocation: "Library",
      campus: "VIT Bhopal",
      reward: 150,
      requestedBy: requester._id,
    });

    const firstRequest = request(app)
      .patch(`/api/v1/tasks/${task._id}/accept`)
      .set("Authorization", `Bearer ${createAccessToken(runnerOne)}`);

    const secondRequest = request(app)
      .patch(`/api/v1/tasks/${task._id}/accept`)
      .set("Authorization", `Bearer ${createAccessToken(runnerTwo)}`);

    const responses = await Promise.all([firstRequest, secondRequest]);
    const statusCodes = responses.map((response) => response.status).sort((left, right) => left - right);
    const successfulResponse = responses.find((response) => response.status === 200);
    const conflictResponse = responses.find((response) => response.status === 409);

    assert.deepEqual(statusCodes, [200, 409]);
    assert.ok(successfulResponse, "expected one runner to accept the task");
    assert.ok(conflictResponse, "expected one runner to receive a conflict");
    assert.equal(successfulResponse.body.success, true);
    assert.equal(successfulResponse.body.data.status, "accepted");
    assert.match(
      conflictResponse.body.message,
      /already been accepted|already taken|Only open tasks can be accepted/i,
    );

    const storedTask = await Task.findById(task._id).lean();

    assert.ok(storedTask, "expected task to exist after acceptance race");
    assert.equal(storedTask.status, "accepted");
    assert.ok(storedTask.acceptedAt, "expected acceptedAt to be stored");
    assert.ok(storedTask.assignedRunner, "expected exactly one assigned runner");

    const assignedRunnerId = storedTask.assignedRunner.toString();
    const allowedRunnerIds = [runnerOne._id.toString(), runnerTwo._id.toString()];

    assert.ok(
      allowedRunnerIds.includes(assignedRunnerId),
      "expected assigned runner to be one of the competing runners",
    );
  });
});