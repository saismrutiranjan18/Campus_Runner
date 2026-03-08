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

describe("dynamic pricing engine", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-dynamic-pricing-tests",
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

  it("returns a quote preview and stores an immutable pricing breakdown on created tasks", async () => {
    const requester = await createUser({
      fullName: "Pricing Requester",
      email: "pricing-requester@example.com",
      role: "requester",
    });

    const authHeader = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const pricingPayload = {
      campus: "Main Campus",
      distanceKm: 4.5,
      urgencyLevel: "priority",
      requestedTimeWindowMinutes: 45,
      campusZone: "remote",
      transportMode: "bike",
    };

    const previewResponse = await request(app)
      .post("/api/v1/tasks/quote-preview")
      .set(authHeader)
      .send(pricingPayload);

    assert.equal(previewResponse.status, 200);
    assert.equal(previewResponse.body.data.quote.mode, "dynamic");
    assert.ok(previewResponse.body.data.quote.total > 0);
    assert.equal(previewResponse.body.data.quote.components.baseFee, 20);
    assert.equal(previewResponse.body.data.quote.components.zoneSurcharge, 16);

    const createResponse = await request(app)
      .post("/api/v1/tasks")
      .set(authHeader)
      .send({
        title: "Dynamically priced task",
        description: "Task with pricing breakdown",
        pickupLocation: "Main Gate",
        dropoffLocation: "Library",
        ...pricingPayload,
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.reward, previewResponse.body.data.quote.total);
    assert.equal(createResponse.body.data.pricingSnapshot.total, createResponse.body.data.reward);
    assert.equal(createResponse.body.data.pricingSnapshot.campusZone, "remote");
    assert.equal(createResponse.body.data.pricingSnapshot.urgencyLevel, "priority");

    const postCreatePreviewResponse = await request(app)
      .post("/api/v1/tasks/quote-preview")
      .set(authHeader)
      .send(pricingPayload);

    assert.equal(postCreatePreviewResponse.status, 200);
    assert.ok(postCreatePreviewResponse.body.data.quote.total > previewResponse.body.data.quote.total);

    const persistedTask = await Task.findById(createResponse.body.data.id).lean();
    assert.equal(persistedTask.reward, createResponse.body.data.reward);
    assert.equal(persistedTask.pricingSnapshot.total, createResponse.body.data.reward);
    assert.equal(persistedTask.pricingSnapshot.demandOpenTaskCount, 0);
  });

  it("preserves backward-compatible manual rewards when pricing inputs are not supplied", async () => {
    const requester = await createUser({
      fullName: "Manual Reward Requester",
      email: "manual-reward-requester@example.com",
      role: "requester",
    });

    const createResponse = await request(app)
      .post("/api/v1/tasks")
      .set({ Authorization: `Bearer ${createAccessToken(requester)}` })
      .send({
        title: "Legacy reward task",
        description: "Legacy reward path",
        pickupLocation: "Main Gate",
        dropoffLocation: "Library",
        campus: "Main Campus",
        reward: 80,
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.reward, 80);
    assert.equal(createResponse.body.data.pricingSnapshot.mode, "manual");
    assert.equal(createResponse.body.data.pricingSnapshot.total, 80);
  });
});