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

const [{ app }, { IdempotencyRequest }, { Task }, { User }, { WalletTransaction }] =
  await Promise.all([
    import("../src/app.js"),
    import("../src/models/idempotencyRequest.model.js"),
    import("../src/models/task.model.js"),
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

const createUser = async ({ fullName, email, role, campusScopes = [] }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified: true,
    isActive: true,
    phoneNumber: "",
    campusId: campusScopes[0]?.campusId || "main-campus",
    campusName: campusScopes[0]?.campusName || "Main Campus",
    campusScopes,
  });
};

describe("idempotency support for backend write APIs", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-idempotency-tests",
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
      IdempotencyRequest.deleteMany({}),
      Task.deleteMany({}),
      User.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });

  it("replays task creation responses instead of creating duplicate tasks", async () => {
    const requester = await createUser({
      fullName: "Task Requester",
      email: "requester-idempotency@example.com",
      role: "requester",
      campusScopes: [
        {
          campusId: "north-campus",
          campusName: "North Campus",
        },
      ],
    });

    const authHeaders = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const idempotencyKey = "task-create-001";
    const payload = {
      title: "Library pickup",
      description: "Pick up a parcel from the library desk",
      pickupLocation: "Library",
      dropoffLocation: "Hostel A",
      campus: "north-campus",
      reward: 80,
      transportMode: "walk",
    };

    const firstResponse = await request(app)
      .post("/api/v1/tasks")
      .set(authHeaders)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload);

    const secondResponse = await request(app)
      .post("/api/v1/tasks")
      .set(authHeaders)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload);

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(firstResponse.body.data.id, secondResponse.body.data.id);
    assert.equal(secondResponse.headers["idempotency-status"], "replayed");
    assert.equal(await Task.countDocuments({}), 1);
    assert.equal(await IdempotencyRequest.countDocuments({ status: "completed" }), 1);
  });

  it("blocks idempotency-key reuse when the payload changes for wallet credits", async () => {
    const [admin, runner] = await Promise.all([
      createUser({
        fullName: "Wallet Admin",
        email: "wallet-admin@example.com",
        role: "admin",
      }),
      createUser({
        fullName: "Wallet Runner",
        email: "wallet-runner@example.com",
        role: "runner",
      }),
    ]);

    const authHeaders = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const idempotencyKey = "wallet-credit-001";

    const firstResponse = await request(app)
      .post("/api/v1/wallet/transactions/credit")
      .set(authHeaders)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        userId: runner._id.toString(),
        amount: 150,
        description: "Manual earnings adjustment",
        reference: "CREDIT-001",
      });

    const secondResponse = await request(app)
      .post("/api/v1/wallet/transactions/credit")
      .set(authHeaders)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        userId: runner._id.toString(),
        amount: 175,
        description: "Manual earnings adjustment",
        reference: "CREDIT-001",
      });

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 409);
    assert.match(secondResponse.body.message, /already been used with a different request payload/i);
    assert.equal(await WalletTransaction.countDocuments({}), 1);
  });

  it("replays admin suspension responses instead of applying the action twice", async () => {
    const [admin, runner] = await Promise.all([
      createUser({
        fullName: "Suspend Admin",
        email: "suspend-admin@example.com",
        role: "admin",
      }),
      createUser({
        fullName: "Suspend Runner",
        email: "suspend-runner@example.com",
        role: "runner",
      }),
    ]);

    const authHeaders = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const idempotencyKey = "admin-suspend-001";

    const firstResponse = await request(app)
      .patch(`/api/v1/admin/users/${runner._id}/suspend`)
      .set(authHeaders)
      .set("Idempotency-Key", idempotencyKey)
      .send({ suspensionReason: "Repeated policy violations" });

    const secondResponse = await request(app)
      .patch(`/api/v1/admin/users/${runner._id}/suspend`)
      .set(authHeaders)
      .set("Idempotency-Key", idempotencyKey)
      .send({ suspensionReason: "Repeated policy violations" });

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.equal(secondResponse.headers["idempotency-status"], "replayed");
    assert.equal(firstResponse.body.data.id, secondResponse.body.data.id);
    assert.equal(firstResponse.body.data.suspendedAt, secondResponse.body.data.suspendedAt);

    const suspendedRunner = await User.findById(runner._id);
    assert.equal(suspendedRunner.isActive, false);
    assert.equal(await IdempotencyRequest.countDocuments({ status: "completed" }), 1);
  });
});