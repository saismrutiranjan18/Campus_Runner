import mongoose from "mongoose";

import { Report } from "../models/report.model.js";
import {
  normalizeAttachmentMetadata,
  sanitizeAttachmentMetadata,
} from "../utils/attachmentMetadata.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const reportAttachmentPopulateFields = [
  {
    path: "attachments.uploadedBy",
    select: "fullName email phoneNumber role isVerified isActive",
  },
];

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
  };
};

const ensureValidReportId = (reportId) => {
  if (!mongoose.isValidObjectId(reportId)) {
    throw new ApiError(400, "Invalid report id provided");
  }
};

const fetchReportOrThrow = async (reportId) => {
  ensureValidReportId(reportId);

  const report = await Report.findById(reportId).populate(reportAttachmentPopulateFields);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  return report;
};

const addReportAttachment = asyncHandler(async (req, res) => {
  const report = await fetchReportOrThrow(req.params.reportId);
  const attachmentMetadata = normalizeAttachmentMetadata(req.body, {
    defaultKind: "report_evidence",
    allowedKinds: ["attachment", "report_evidence"],
  });

  report.attachments.push({
    ...attachmentMetadata,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  });

  await report.save();
  await report.populate(reportAttachmentPopulateFields);

  const createdAttachment = report.attachments[report.attachments.length - 1];

  res.status(201).json(
    new ApiResponse(
      201,
      {
        reportId: report._id,
        attachment: sanitizeAttachmentMetadata(createdAttachment, sanitizeUser),
      },
      "Report attachment metadata added successfully",
    ),
  );
});

const removeReportAttachment = asyncHandler(async (req, res) => {
  const report = await fetchReportOrThrow(req.params.reportId);
  const attachment = report.attachments.id(req.params.attachmentId);

  if (!attachment) {
    throw new ApiError(404, "Report attachment not found");
  }

  attachment.deleteOne();

  await report.save();
  await report.populate(reportAttachmentPopulateFields);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        reportId: report._id,
        attachments: report.attachments.map((item) => sanitizeAttachmentMetadata(item, sanitizeUser)),
      },
      "Report attachment metadata removed successfully",
    ),
  );
});

export { addReportAttachment, removeReportAttachment };