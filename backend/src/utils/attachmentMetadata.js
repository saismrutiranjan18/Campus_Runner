import mongoose from "mongoose";

import { ApiError } from "./ApiError.js";

const allowedAttachmentKinds = ["attachment", "proof_of_delivery", "report_evidence"];

const attachmentMetadataSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: allowedAttachmentKinds,
      default: "attachment",
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
      default: "",
    },
    sizeBytes: {
      type: Number,
      min: 0,
      default: 0,
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    storageKey: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const normalizeAttachmentMetadata = (
  payload,
  { defaultKind = "attachment", allowedKinds = allowedAttachmentKinds } = {},
) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(400, "attachment metadata payload must be an object");
  }

  const kind = String(payload.kind || defaultKind).trim() || defaultKind;
  if (!allowedKinds.includes(kind)) {
    throw new ApiError(400, "Invalid attachment kind provided");
  }

  const fileName = String(payload.fileName || "").trim();
  if (!fileName) {
    throw new ApiError(400, "fileName is required");
  }

  const url = String(payload.url || "").trim();
  const storageKey = String(payload.storageKey || "").trim();
  if (!url && !storageKey) {
    throw new ApiError(400, "Either url or storageKey is required");
  }

  const rawSizeBytes = payload.sizeBytes === undefined ? 0 : Number(payload.sizeBytes);
  if (!Number.isFinite(rawSizeBytes) || rawSizeBytes < 0) {
    throw new ApiError(400, "sizeBytes must be a non-negative number");
  }

  return {
    kind,
    fileName,
    mimeType: String(payload.mimeType || "").trim(),
    sizeBytes: Math.round(rawSizeBytes),
    url,
    storageKey,
    note: String(payload.note || "").trim(),
  };
};

const sanitizeAttachmentMetadata = (attachment, sanitizeUser) => {
  if (!attachment) {
    return null;
  }

  return {
    id: attachment._id,
    kind: attachment.kind,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    url: attachment.url,
    storageKey: attachment.storageKey,
    note: attachment.note,
    uploadedBy: sanitizeUser ? sanitizeUser(attachment.uploadedBy) : attachment.uploadedBy,
    uploadedAt: attachment.uploadedAt,
  };
};

export {
  allowedAttachmentKinds,
  attachmentMetadataSchema,
  normalizeAttachmentMetadata,
  sanitizeAttachmentMetadata,
};