import { Dispute } from "../models/dispute.model.js";
import { Report } from "../models/report.model.js";
import { Task } from "../models/task.model.js";

const roundToTwoDecimals = (value) => {
  return Math.round(value * 100) / 100;
};

const calculateTrustScore = ({
  totalTasks,
  completionRate,
  cancellationRate,
  disputeCount,
  openDisputeCount,
  reportCount,
  reviewedReportCount,
  moderationIncidentCount,
}) => {
  if (totalTasks === 0) {
    return 50;
  }

  let score = 100;
  score -= cancellationRate * 0.35;
  score += completionRate * 0.15;
  score -= disputeCount * 4;
  score -= openDisputeCount * 3;
  score -= reportCount * 3;
  score -= reviewedReportCount * 2;
  score -= moderationIncidentCount * 8;

  return roundToTwoDecimals(Math.min(100, Math.max(0, score)));
};

const buildRequesterMetricsMap = async (requesterIds) => {
  if (requesterIds.length === 0) {
    return new Map();
  }

  const [tasks, disputes, reports] = await Promise.all([
    Task.find({ requestedBy: { $in: requesterIds } })
      .select("requestedBy status isArchived")
      .lean(),
    Dispute.find({ openedBy: { $in: requesterIds }, openedByRole: "requester" })
      .select("openedBy status")
      .lean(),
    Report.find({ reporter: { $in: requesterIds } })
      .select("reporter status")
      .lean(),
  ]);

  const metricsByRequesterId = new Map();

  const ensureMetrics = (requesterId) => {
    if (!metricsByRequesterId.has(requesterId)) {
      metricsByRequesterId.set(requesterId, {
        totalTaskCount: 0,
        openTaskCount: 0,
        completedTaskCount: 0,
        cancelledTaskCount: 0,
        archivedTaskCount: 0,
        disputeCount: 0,
        openDisputeCount: 0,
        reportCount: 0,
        reviewedReportCount: 0,
        moderationIncidentCount: 0,
      });
    }

    return metricsByRequesterId.get(requesterId);
  };

  for (const task of tasks) {
    const requesterId = String(task.requestedBy);
    const metrics = ensureMetrics(requesterId);

    metrics.totalTaskCount += 1;

    if (task.status === "open") {
      metrics.openTaskCount += 1;
    }

    if (task.status === "completed") {
      metrics.completedTaskCount += 1;
    }

    if (task.status === "cancelled") {
      metrics.cancelledTaskCount += 1;
    }

    if (task.isArchived) {
      metrics.archivedTaskCount += 1;
      metrics.moderationIncidentCount += 1;
    }
  }

  for (const dispute of disputes) {
    const requesterId = String(dispute.openedBy);
    const metrics = ensureMetrics(requesterId);

    metrics.disputeCount += 1;
    if (dispute.status === "open" || dispute.status === "under_review") {
      metrics.openDisputeCount += 1;
    }
  }

  for (const report of reports) {
    const requesterId = String(report.reporter);
    const metrics = ensureMetrics(requesterId);

    metrics.reportCount += 1;
    if (report.status !== "open") {
      metrics.reviewedReportCount += 1;
      if (["reviewed", "resolved"].includes(report.status)) {
        metrics.moderationIncidentCount += 1;
      }
    }
  }

  for (const requesterId of requesterIds.map(String)) {
    const metrics = ensureMetrics(requesterId);
    const completionRate =
      metrics.totalTaskCount === 0
        ? 0
        : roundToTwoDecimals((metrics.completedTaskCount / metrics.totalTaskCount) * 100);
    const cancellationRate =
      metrics.totalTaskCount === 0
        ? 0
        : roundToTwoDecimals((metrics.cancelledTaskCount / metrics.totalTaskCount) * 100);

    metrics.completionRate = completionRate;
    metrics.cancellationRate = cancellationRate;
    metrics.trustScore = calculateTrustScore({
      totalTasks: metrics.totalTaskCount,
      completionRate,
      cancellationRate,
      disputeCount: metrics.disputeCount,
      openDisputeCount: metrics.openDisputeCount,
      reportCount: metrics.reportCount,
      reviewedReportCount: metrics.reviewedReportCount,
      moderationIncidentCount: metrics.moderationIncidentCount,
    });
  }

  return metricsByRequesterId;
};

const buildRequesterReputationEntry = (requester, metrics = {}) => {
  return {
    requester: {
      id: requester._id,
      fullName: requester.fullName,
      email: requester.email,
      phoneNumber: requester.phoneNumber,
      campusId: requester.campusId,
      campusName: requester.campusName,
      isVerified: requester.isVerified,
      isActive: requester.isActive,
      createdAt: requester.createdAt,
      updatedAt: requester.updatedAt,
    },
    metrics: {
      totalTaskCount: metrics.totalTaskCount || 0,
      openTaskCount: metrics.openTaskCount || 0,
      completedTaskCount: metrics.completedTaskCount || 0,
      cancelledTaskCount: metrics.cancelledTaskCount || 0,
      archivedTaskCount: metrics.archivedTaskCount || 0,
      completionRate: metrics.completionRate || 0,
      cancellationRate: metrics.cancellationRate || 0,
      disputeCount: metrics.disputeCount || 0,
      openDisputeCount: metrics.openDisputeCount || 0,
      reportCount: metrics.reportCount || 0,
      reviewedReportCount: metrics.reviewedReportCount || 0,
      moderationIncidentCount: metrics.moderationIncidentCount || 0,
      trustScore: metrics.trustScore ?? 50,
    },
  };
};

export { buildRequesterMetricsMap, buildRequesterReputationEntry };