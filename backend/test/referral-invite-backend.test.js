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

const [{ app }, { Referral }, { Task }, { User }, { WalletTransaction }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/referral.model.js"),
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

const createUser = async ({ fullName, email, role, phoneNumber = "" }) => {
  return User.create({
    fullName,
    email,
    password: "Password123!",
    role,
    isVerified: true,
    isActive: true,
    phoneNumber,
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

const completeTaskForUsers = async ({ requester, runner }) => {
  const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
  const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

  const createResponse = await request(app)
    .post("/api/v1/tasks")
    .set(requesterAuth)
    .send({
      title: "Referral qualifying task",
      description: "Referral qualifying task description",
      pickupLocation: "Block A",
      dropoffLocation: "Library",
      campus: "Main Campus",
      reward: 90,
    });

  assert.equal(createResponse.status, 201);

  const acceptResponse = await request(app)
    .patch(`/api/v1/tasks/${createResponse.body.data.id}/accept`)
    .set(runnerAuth);
  assert.equal(acceptResponse.status, 200);

  const inProgressResponse = await request(app)
    .patch(`/api/v1/tasks/${createResponse.body.data.id}/in-progress`)
    .set(runnerAuth);
  assert.equal(inProgressResponse.status, 200);

  const completeResponse = await request(app)
    .patch(`/api/v1/tasks/${createResponse.body.data.id}/complete`)
    .set(runnerAuth);
  assert.equal(completeResponse.status, 200);

  return createResponse.body.data.id;
};

describe("referral and invite backend", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-referral-tests",
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
      Referral.deleteMany({}),
      Task.deleteMany({}),
      User.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });

  it("attributes a referral during registration and rewards both users after the invitee completes a first task", async () => {
    const inviter = await createUser({
      fullName: "Inviter User",
      email: "inviter@example.com",
      role: "requester",
      phoneNumber: "+910000000001",
    });
    const runner = await createUser({
      fullName: "Helper Runner",
      email: "helper-runner@example.com",
      role: "runner",
      phoneNumber: "+910000000099",
    });

    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        fullName: "Invitee User",
        email: "invitee@example.com",
        password: "Password123!",
        role: "requester",
        campusId: "main-campus",
        campusName: "Main Campus",
        phoneNumber: "+910000000002",
        inviteCode: inviter.inviteCode,
      });

    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.data.referral.inviteCode, inviter.inviteCode);

    const invitee = await User.findOne({ email: "invitee@example.com" });
    const taskId = await completeTaskForUsers({ requester: invitee, runner });
    assert.ok(taskId);

    const referral = await Referral.findOne({ invitee: invitee._id }).lean();
    assert.equal(referral.status, "rewarded");
    assert.equal(referral.inviterRewardAmount, 75);
    assert.equal(referral.inviteeRewardAmount, 25);
    assert.ok(referral.qualificationTask);

    const rewardTransactions = await WalletTransaction.find({
      category: "referral_reward",
    }).sort({ amount: -1 }).lean();

    assert.equal(rewardTransactions.length, 2);
    assert.equal(rewardTransactions[0].amount, 75);
    assert.equal(rewardTransactions[1].amount, 25);
  });

  it("lets a fresh user claim a referral code and blocks duplicate or self referral abuse", async () => {
    const inviter = await createUser({
      fullName: "Claim Inviter",
      email: "claim-inviter@example.com",
      role: "runner",
      phoneNumber: "+910000000010",
    });
    const invitee = await createUser({
      fullName: "Claim Invitee",
      email: "claim-invitee@example.com",
      role: "requester",
      phoneNumber: "+910000000011",
    });

    const inviteeAuth = { Authorization: `Bearer ${createAccessToken(invitee)}` };

    const claimResponse = await request(app)
      .post("/api/v1/referrals/claim")
      .set(inviteeAuth)
      .set("Idempotency-Key", "claim-referral-001")
      .send({ inviteCode: inviter.inviteCode });

    assert.equal(claimResponse.status, 201);
    assert.equal(claimResponse.body.data.status, "attributed");

    const duplicateClaimResponse = await request(app)
      .post("/api/v1/referrals/claim")
      .set(inviteeAuth)
      .set("Idempotency-Key", "claim-referral-002")
      .send({ inviteCode: inviter.inviteCode });

    assert.equal(duplicateClaimResponse.status, 409);

    const selfClaimResponse = await request(app)
      .post("/api/v1/referrals/claim")
      .set({ Authorization: `Bearer ${createAccessToken(inviter)}` })
      .set("Idempotency-Key", "claim-referral-003")
      .send({ inviteCode: inviter.inviteCode });

    assert.equal(selfClaimResponse.status, 400);
  });

  it("blocks referral attribution when inviter and invitee share the same phone number", async () => {
    const inviter = await createUser({
      fullName: "Phone Inviter",
      email: "phone-inviter@example.com",
      role: "requester",
      phoneNumber: "+910000000020",
    });

    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        fullName: "Phone Invitee",
        email: "phone-invitee@example.com",
        password: "Password123!",
        role: "runner",
        campusId: "main-campus",
        campusName: "Main Campus",
        phoneNumber: "+910000000020",
        inviteCode: inviter.inviteCode,
      });

    assert.equal(registerResponse.status, 400);
    assert.match(registerResponse.body.message, /same phone number/i);
  });

  it("returns referral summary for the authenticated user", async () => {
    const inviter = await createUser({
      fullName: "Summary Inviter",
      email: "summary-inviter@example.com",
      role: "requester",
    });
    const invitee = await createUser({
      fullName: "Summary Invitee",
      email: "summary-invitee@example.com",
      role: "runner",
    });

    await Referral.create({
      inviter: inviter._id,
      invitee: invitee._id,
      inviteCode: inviter.inviteCode,
      attributionSource: "claim",
      status: "attributed",
    });

    const summaryResponse = await request(app)
      .get("/api/v1/referrals/me")
      .set({ Authorization: `Bearer ${createAccessToken(inviter)}` });

    assert.equal(summaryResponse.status, 200);
    assert.equal(summaryResponse.body.data.inviteCode, inviter.inviteCode);
    assert.equal(summaryResponse.body.data.rewards.sentCount, 1);
    assert.equal(summaryResponse.body.data.referralsSent.length, 1);
  });
});