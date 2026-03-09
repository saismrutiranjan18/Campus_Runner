import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-access-secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";

const [{ app }, { Session }, { User }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/session.model.js"),
  import("../src/models/user.model.js"),
]);

describe("session history api", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-session-history-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Session.deleteMany({})]);
  });

  it("lists recent login sessions with token issuance metadata and allows manual revocation", async () => {
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .set("User-Agent", "SessionTestBrowser/1.0")
      .set("X-Forwarded-For", "203.0.113.10")
      .send({
        fullName: "Session User",
        email: "session-user@example.com",
        password: "Password123!",
        role: "requester",
      });

    assert.equal(registerResponse.status, 201);
    const firstRefreshToken = registerResponse.body.data.refreshToken;

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .set("User-Agent", "SessionTestBrowser/2.0")
      .set("X-Forwarded-For", "203.0.113.20")
      .send({
        email: "session-user@example.com",
        password: "Password123!",
      });

    assert.equal(loginResponse.status, 200);

    const accessToken = loginResponse.body.data.accessToken;
    const secondRefreshToken = loginResponse.body.data.refreshToken;

    const sessionsResponse = await request(app)
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(sessionsResponse.status, 200);
    assert.equal(sessionsResponse.body.data.items.length, 2);
    assert.ok(sessionsResponse.body.data.items[0].accessTokenIssuedAt);
    assert.ok(sessionsResponse.body.data.items[0].refreshTokenIssuedAt);
    assert.ok(sessionsResponse.body.data.items.some((item) => item.ipAddress === "203.0.113.10"));
    assert.ok(sessionsResponse.body.data.items.some((item) => item.ipAddress === "203.0.113.20"));
    assert.ok(sessionsResponse.body.data.items.some((item) => item.isCurrent === true));

    const sessionToRevoke = sessionsResponse.body.data.items.find((item) => item.ipAddress === "203.0.113.10");
    assert.ok(sessionToRevoke);

    const revokeResponse = await request(app)
      .delete(`/api/v1/auth/sessions/${sessionToRevoke.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(revokeResponse.status, 200);
    assert.ok(revokeResponse.body.data.revokedAt);

    const revokedRefreshResponse = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: firstRefreshToken });

    assert.equal(revokedRefreshResponse.status, 401);

    const activeRefreshResponse = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: secondRefreshToken });

    assert.equal(activeRefreshResponse.status, 200);
  });
});