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

const [{ app }, { RateLimitBucket }, { Task }, { User }, { WalletTransaction }] =
  await Promise.all([
    import("../src/app.js"),
    import("../src/models/rateLimitBucket.model.js"),
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

describe("rate limiting and abuse controls", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-rate-limits-tests",
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
      RateLimitBucket.deleteMany({}),
      Task.deleteMany({}),
      User.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });

  it("throttles repeated registration attempts from the same client", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await request(app).post("/api/v1/auth/register").send({
        fullName: `Requester ${index}`,
        email: `requester-${index}@example.com`,
        password: "Password123!",
      });

      assert.equal(response.status, 201);
      assert.equal(response.headers["x-ratelimit-limit"], "5");
    }

    const throttledResponse = await request(app).post("/api/v1/auth/register").send({
      fullName: "Requester Final",
      email: "requester-final@example.com",
      password: "Password123!",
    });

    assert.equal(throttledResponse.status, 429);
    assert.match(throttledResponse.body.message, /registration attempts/i);
    assert.ok(Number(throttledResponse.headers["retry-after"]) >= 1);
  });

  it("throttles repeated task creation attempts for the same requester", async () => {
    const requester = await createUser({
      fullName: "Task Requester",
      email: "task-requester@example.com",
      role: "requester",
    });
    const authHeaders = { Authorization: `Bearer ${createAccessToken(requester)}` };

    for (let index = 0; index < 5; index += 1) {
      const response = await request(app)
        .post("/api/v1/tasks")
        .set(authHeaders)
        .send({
          title: `Task ${index}`,
          description: `Task ${index} description`,
          pickupLocation: "Academic Block",
          dropoffLocation: "Library",
          campus: "main-campus",
          reward: 25,
        });

      assert.equal(response.status, 201);
    }

    const throttledResponse = await request(app)
      .post("/api/v1/tasks")
      .set(authHeaders)
      .send({
        title: "Task final",
        description: "Task final description",
        pickupLocation: "Academic Block",
        dropoffLocation: "Library",
        campus: "main-campus",
        reward: 25,
      });

    assert.equal(throttledResponse.status, 429);
    assert.match(throttledResponse.body.message, /task creation limit exceeded/i);
  });

  it("throttles repeated wallet mutations for the same admin", async () => {
    const [admin, runner] = await Promise.all([
      createUser({ fullName: "Wallet Admin", email: "wallet-admin@example.com", role: "admin" }),
      createUser({ fullName: "Wallet Runner", email: "wallet-runner@example.com", role: "runner" }),
    ]);
    const authHeaders = { Authorization: `Bearer ${createAccessToken(admin)}` };

    for (let index = 0; index < 10; index += 1) {
      const response = await request(app)
        .post("/api/v1/wallet/transactions/credit")
        .set(authHeaders)
        .send({
          userId: runner._id.toString(),
          amount: 50,
          description: `Wallet credit ${index}`,
          reference: `WC-${index}`,
        });

      assert.equal(response.status, 201);
    }

    const throttledResponse = await request(app)
      .post("/api/v1/wallet/transactions/credit")
      .set(authHeaders)
      .send({
        userId: runner._id.toString(),
        amount: 50,
        description: "Wallet credit final",
        reference: "WC-final",
      });

    assert.equal(throttledResponse.status, 429);
    assert.match(throttledResponse.body.message, /wallet change limit exceeded/i);
  });

  it("throttles repeated admin sensitive mutations", async () => {
    const admin = await createUser({
      fullName: "Admin Moderator",
      email: "admin-moderator@example.com",
      role: "admin",
    });
    const authHeaders = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const targetUsers = await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        createUser({
          fullName: `Runner ${index}`,
          email: `runner-${index}@example.com`,
          role: "runner",
        }),
      ),
    );

    for (let index = 0; index < 10; index += 1) {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${targetUsers[index]._id}/suspend`)
        .set(authHeaders)
        .send({ suspensionReason: `Suspension ${index}` });

      assert.equal(response.status, 200);
    }

    const throttledResponse = await request(app)
      .patch(`/api/v1/admin/users/${targetUsers[10]._id}/suspend`)
      .set(authHeaders)
      .send({ suspensionReason: "Suspension final" });

    assert.equal(throttledResponse.status, 429);
    assert.match(throttledResponse.body.message, /admin action rate limit exceeded/i);
  });
});