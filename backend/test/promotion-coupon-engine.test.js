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

const [{ app }, { Promotion }, { PromotionRedemption }, { Task }, { User }, { WalletTransaction }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/promotion.model.js"),
  import("../src/models/promotionRedemption.model.js"),
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

const createUser = async ({ fullName, email, role, campusId = "main-campus", campusName = "Main Campus" }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified: true,
    isActive: true,
    phoneNumber: "",
    campusId,
    campusName,
    campusScopes: [
      {
        campusId,
        campusName,
      },
    ],
  });
};

describe("promotion and coupon engine", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-promotion-engine-tests",
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
      Promotion.deleteMany({}),
      PromotionRedemption.deleteMany({}),
      Task.deleteMany({}),
      User.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });

  it("validates a campus-specific coupon at quote preview and task creation time with one-time usage enforcement", async () => {
    const [admin, requester] = await Promise.all([
      createUser({ fullName: "Admin Promo", email: "admin-promo@example.com", role: "admin" }),
      createUser({ fullName: "Requester Promo", email: "requester-promo@example.com", role: "requester" }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };

    const createPromotionResponse = await request(app)
      .post("/api/v1/admin/promotions")
      .set(adminAuth)
      .set("Idempotency-Key", "promo-create-001")
      .send({
        code: "NORTH25",
        title: "North Campus 25% Off",
        kind: "task_discount",
        discountType: "percentage",
        discountValue: 25,
        oneTimePerUser: true,
        validFrom: "2026-03-01T00:00:00.000Z",
        validUntil: "2026-03-31T23:59:59.999Z",
        campusTargets: {
          campusNames: ["Main Campus"],
        },
        minimumTaskReward: 100,
      });

    assert.equal(createPromotionResponse.status, 201);
    assert.equal(createPromotionResponse.body.data.code, "NORTH25");

    const previewResponse = await request(app)
      .post("/api/v1/tasks/quote-preview")
      .set(requesterAuth)
      .send({
        campus: "Main Campus",
        reward: 200,
        promoCode: "north25",
      });

    assert.equal(previewResponse.status, 200);
    assert.equal(previewResponse.body.data.promotion.discountAmount, 50);
    assert.equal(previewResponse.body.data.total, 150);

    const createTaskResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Promo task",
        description: "Task with coupon",
        pickupLocation: "Main Gate",
        dropoffLocation: "Library",
        campus: "Main Campus",
        reward: 200,
        promoCode: "NORTH25",
      });

    assert.equal(createTaskResponse.status, 201);
    assert.equal(createTaskResponse.body.data.reward, 150);
    assert.equal(createTaskResponse.body.data.promotionSnapshot.code, "NORTH25");
    assert.equal(createTaskResponse.body.data.promotionSnapshot.discountAmount, 50);

    const reusedPromotionResponse = await request(app)
      .post("/api/v1/tasks")
      .set(requesterAuth)
      .send({
        title: "Promo task two",
        description: "Second coupon task",
        pickupLocation: "Main Gate",
        dropoffLocation: "Library",
        campus: "Main Campus",
        reward: 200,
        promoCode: "NORTH25",
      });

    assert.equal(reusedPromotionResponse.status, 409);
    assert.match(reusedPromotionResponse.body.message, /once per user/i);
  });

  it("blocks campus-specific coupons on the wrong campus and supports wallet-credit promotions", async () => {
    const [admin, requester, runner] = await Promise.all([
      createUser({ fullName: "Admin Wallet Promo", email: "admin-wallet-promo@example.com", role: "admin" }),
      createUser({
        fullName: "Requester Wrong Campus",
        email: "requester-wrong-campus@example.com",
        role: "requester",
        campusId: "south-campus",
        campusName: "South Campus",
      }),
      createUser({ fullName: "Runner Wallet Promo", email: "runner-wallet-promo@example.com", role: "runner" }),
    ]);

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };
    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    await request(app)
      .post("/api/v1/admin/promotions")
      .set(adminAuth)
      .set("Idempotency-Key", "promo-create-002")
      .send({
        code: "MAINFIXED",
        title: "Main Campus fixed discount",
        kind: "task_discount",
        discountType: "fixed",
        discountValue: 30,
        campusTargets: {
          campusIds: ["main-campus"],
        },
      });

    const wrongCampusPreviewResponse = await request(app)
      .post("/api/v1/tasks/quote-preview")
      .set(requesterAuth)
      .send({
        campus: "South Campus",
        reward: 120,
        promoCode: "MAINFIXED",
      });

    assert.equal(wrongCampusPreviewResponse.status, 403);
    assert.match(wrongCampusPreviewResponse.body.message, /not available for this campus/i);

    await request(app)
      .post("/api/v1/admin/promotions")
      .set(adminAuth)
      .set("Idempotency-Key", "promo-create-003")
      .send({
        code: "WALLET50",
        title: "Wallet credit bonus",
        kind: "wallet_credit",
        walletCreditAmount: 50,
        oneTimePerUser: true,
      });

    const claimResponse = await request(app)
      .post("/api/v1/wallet/promotions/claim")
      .set(runnerAuth)
      .set("Idempotency-Key", "wallet-promo-claim-001")
      .send({ code: "WALLET50" });

    assert.equal(claimResponse.status, 201);
    assert.equal(claimResponse.body.data.transaction.amount, 50);
    assert.equal(claimResponse.body.data.transaction.category, "promotion_credit");

    const duplicateClaimResponse = await request(app)
      .post("/api/v1/wallet/promotions/claim")
      .set(runnerAuth)
      .set("Idempotency-Key", "wallet-promo-claim-002")
      .send({ code: "WALLET50" });

    assert.equal(duplicateClaimResponse.status, 409);
    assert.match(duplicateClaimResponse.body.message, /once per user/i);
  });
});