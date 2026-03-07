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
  });
};

describe("requester task history", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-requester-history-tests",
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

  it("returns only the current requester's tasks with pagination and filters", async () => {
    const [requesterOne, requesterTwo, runner] = await Promise.all([
      createUser({
        fullName: "Requester One",
        email: "requester-one@example.com",
        role: "requester",
      }),
      createUser({
        fullName: "Requester Two",
        email: "requester-two@example.com",
        role: "requester",
      }),
      createUser({
        fullName: "Runner One",
        email: "runner-one@example.com",
        role: "runner",
      }),
    ]);

    await Task.create([
      {
        title: "Library pickup run",
        description: "Collect books from library",
        pickupLocation: "Central Library",
        dropoffLocation: "Hostel A",
        reward: 100,
        requestedBy: requesterOne._id,
        assignedRunner: runner._id,
        status: "completed",
        createdAt: new Date("2026-03-02T10:00:00.000Z"),
        updatedAt: new Date("2026-03-02T11:00:00.000Z"),
      },
      {
        title: "North gate parcel",
        description: "Pick parcel from gate",
        pickupLocation: "North Gate",
        dropoffLocation: "Hostel B",
        reward: 50,
        requestedBy: requesterOne._id,
        status: "cancelled",
        createdAt: new Date("2026-03-05T12:00:00.000Z"),
        updatedAt: new Date("2026-03-05T13:00:00.000Z"),
      },
      {
        title: "Cafeteria token pickup",
        description: "Pick up meal token",
        pickupLocation: "Cafeteria",
        dropoffLocation: "Academic Block",
        reward: 30,
        requestedBy: requesterOne._id,
        status: "open",
        createdAt: new Date("2026-02-20T09:00:00.000Z"),
        updatedAt: new Date("2026-02-20T09:30:00.000Z"),
      },
      {
        title: "Library documents",
        description: "Another requester task",
        pickupLocation: "Central Library",
        dropoffLocation: "Hostel C",
        reward: 40,
        requestedBy: requesterTwo._id,
        status: "completed",
        createdAt: new Date("2026-03-04T08:00:00.000Z"),
        updatedAt: new Date("2026-03-04T09:00:00.000Z"),
      },
    ]);

    const authHeader = {
      Authorization: `Bearer ${createAccessToken(requesterOne)}`,
    };

    const paginatedResponse = await request(app)
      .get("/api/v1/tasks/history?page=1&limit=2&sort=desc")
      .set(authHeader);

    assert.equal(paginatedResponse.status, 200);
    assert.equal(paginatedResponse.body.success, true);
    assert.equal(paginatedResponse.body.data.items.length, 2);
    assert.equal(paginatedResponse.body.data.pagination.total, 3);
    assert.equal(paginatedResponse.body.data.pagination.totalPages, 2);
    assert.ok(
      paginatedResponse.body.data.items.every(
        (task) => task.requestedBy.id === requesterOne._id.toString(),
      ),
    );

    const filteredResponse = await request(app)
      .get(
        "/api/v1/tasks/history?status=completed&search=library&fromDate=2026-03-01&toDate=2026-03-08",
      )
      .set(authHeader);

    assert.equal(filteredResponse.status, 200);
    assert.equal(filteredResponse.body.success, true);
    assert.equal(filteredResponse.body.data.items.length, 1);
    assert.equal(filteredResponse.body.data.items[0].title, "Library pickup run");
    assert.equal(filteredResponse.body.data.items[0].requestedBy.id, requesterOne._id.toString());
    assert.equal(filteredResponse.body.data.items[0].status, "completed");
    assert.equal(filteredResponse.body.data.filters.status, "completed");
    assert.equal(filteredResponse.body.data.filters.search, "library");
    assert.equal(filteredResponse.body.data.filters.fromDate, "2026-03-01");
    assert.equal(filteredResponse.body.data.filters.toDate, "2026-03-08");
  });
});