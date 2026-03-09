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

const [{ app }, { Report }, { Task }, { User }] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/report.model.js"),
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

describe("file upload metadata api", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "campus-runner-file-metadata-tests",
    });
  });

  after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Task.deleteMany({}), Report.deleteMany({})]);
  });

  it("stores task attachments and proof-of-delivery metadata for task participants", async () => {
    const [requester, runner] = await Promise.all([
      createUser({ fullName: "Requester", email: "task-meta-requester@example.com", role: "requester" }),
      createUser({ fullName: "Runner", email: "task-meta-runner@example.com", role: "runner" }),
    ]);

    const task = await Task.create({
      title: "Deliver package",
      description: "Take the package to hostel reception",
      pickupLocation: "Admin Block",
      dropoffLocation: "Hostel Reception",
      campus: "main-campus",
      reward: 75,
      requestedBy: requester._id,
      assignedRunner: runner._id,
      status: "completed",
      acceptedAt: new Date("2026-03-08T10:00:00.000Z"),
      startedAt: new Date("2026-03-08T10:15:00.000Z"),
      completedAt: new Date("2026-03-08T10:40:00.000Z"),
    });

    const requesterAuth = { Authorization: `Bearer ${createAccessToken(requester)}` };
    const runnerAuth = { Authorization: `Bearer ${createAccessToken(runner)}` };

    const attachmentResponse = await request(app)
      .post(`/api/v1/tasks/${task._id}/attachments`)
      .set(requesterAuth)
      .send({
        kind: "attachment",
        fileName: "invoice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        url: "https://cdn.example.com/invoice.pdf",
        note: "Package invoice",
      });

    assert.equal(attachmentResponse.status, 201);
    assert.equal(attachmentResponse.body.data.attachment.kind, "attachment");
    assert.equal(attachmentResponse.body.data.attachment.uploadedBy.id, requester._id.toString());

    const proofResponse = await request(app)
      .post(`/api/v1/tasks/${task._id}/attachments`)
      .set(runnerAuth)
      .send({
        kind: "proof_of_delivery",
        fileName: "delivery-photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 4096,
        storageKey: "proofs/task-1/photo.jpg",
        note: "Delivered to hostel desk",
      });

    assert.equal(proofResponse.status, 201);
    assert.equal(proofResponse.body.data.attachment.kind, "proof_of_delivery");

    const taskResponse = await request(app)
      .get(`/api/v1/tasks/${task._id}`)
      .set(requesterAuth);

    assert.equal(taskResponse.status, 200);
    assert.equal(taskResponse.body.data.attachments.length, 2);
    assert.ok(taskResponse.body.data.attachments.some((item) => item.kind === "proof_of_delivery"));

    const attachmentId = attachmentResponse.body.data.attachment.id;
    const deleteResponse = await request(app)
      .delete(`/api/v1/tasks/${task._id}/attachments/${attachmentId}`)
      .set(requesterAuth);

    assert.equal(deleteResponse.status, 200);
    assert.equal(deleteResponse.body.data.attachments.length, 1);
  });

  it("stores report attachment metadata through admin report routes", async () => {
    const [admin, requester] = await Promise.all([
      createUser({ fullName: "Admin", email: "report-meta-admin@example.com", role: "admin" }),
      createUser({ fullName: "Requester", email: "report-meta-requester@example.com", role: "requester" }),
    ]);

    const task = await Task.create({
      title: "Late delivery",
      description: "Task completed late",
      pickupLocation: "Block A",
      dropoffLocation: "Block B",
      campus: "main-campus",
      reward: 30,
      requestedBy: requester._id,
      status: "cancelled",
      cancelledAt: new Date("2026-03-08T11:00:00.000Z"),
      cancellationReason: "Requester complaint",
    });

    const report = await Report.create({
      entityType: "task",
      reporter: requester._id,
      reportedTask: task._id,
      reason: "Delivery issue",
      details: "Attaching screenshots for review",
    });

    const adminAuth = { Authorization: `Bearer ${createAccessToken(admin)}` };

    const addAttachmentResponse = await request(app)
      .post(`/api/v1/admin/reports/${report._id}/attachments`)
      .set(adminAuth)
      .send({
        kind: "report_evidence",
        fileName: "chat-screenshot.png",
        mimeType: "image/png",
        sizeBytes: 5120,
        url: "https://cdn.example.com/chat-screenshot.png",
        note: "Reporter supplied screenshot",
      });

    assert.equal(addAttachmentResponse.status, 201);
    assert.equal(addAttachmentResponse.body.data.attachment.kind, "report_evidence");

    const reportsResponse = await request(app)
      .get("/api/v1/admin/reports?entityType=task")
      .set(adminAuth);

    assert.equal(reportsResponse.status, 200);
    assert.equal(reportsResponse.body.data.items.length, 1);
    assert.equal(reportsResponse.body.data.items[0].attachments.length, 1);

    const attachmentId = addAttachmentResponse.body.data.attachment.id;
    const removeAttachmentResponse = await request(app)
      .delete(`/api/v1/admin/reports/${report._id}/attachments/${attachmentId}`)
      .set(adminAuth);

    assert.equal(removeAttachmentResponse.status, 200);
    assert.equal(removeAttachmentResponse.body.data.attachments.length, 0);
  });
});