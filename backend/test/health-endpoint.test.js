import { describe, it } from "node:test";
import assert from "node:assert/strict";

import request from "supertest";

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-access-secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const { app } = await import("../src/app.js");

describe("health endpoint", () => {
  it("returns the existing stable payload by default", async () => {
    const response = await request(app).get("/api/v1/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      message: "Backend is healthy",
    });
  });

  it("returns runtime metadata when includeMeta=true", async () => {
    const response = await request(app).get("/api/v1/health?includeMeta=true");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, "Backend is healthy");
    assert.equal(response.body.meta.service, "campus-runner-backend");
    assert.equal(response.body.meta.environment, "test");
    assert.ok(Number.isInteger(response.body.meta.uptimeSeconds));
    assert.ok(response.body.meta.uptimeSeconds >= 0);
    assert.ok(!Number.isNaN(Date.parse(response.body.meta.timestamp)));
    assert.ok(
      response.body.meta.version === null || typeof response.body.meta.version === "string",
    );
  });
});
