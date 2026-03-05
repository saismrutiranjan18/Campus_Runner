// lib/data/models/report_model.dart

enum ReportReason { fraud, harassment, fakeProfile, other }

enum ReportStatus { pending, reviewed, resolved }

extension ReportReasonExtension on ReportReason {
  String get label {
    switch (this) {
      case ReportReason.fraud:
        return 'Fraud';
      case ReportReason.harassment:
        return 'Harassment';
      case ReportReason.fakeProfile:
        return 'Fake Profile';
      case ReportReason.other:
        return 'Other';
    }
  }
}

extension ReportStatusExtension on ReportStatus {
  String get label {
    switch (this) {
      case ReportStatus.pending:
        return 'Pending';
      case ReportStatus.reviewed:
        return 'Reviewed';
      case ReportStatus.resolved:
        return 'Resolved';
    }
  }
}

class ReportModel {
  final String reportId;
  final String reporterId;
  final String reportedUserId;
  final String? taskId;
  final ReportReason reason;
  final String description;
  final List<String> evidence; // image URLs
  final ReportStatus status;
  final DateTime createdAt;

  const ReportModel({
    required this.reportId,
    required this.reporterId,
    required this.reportedUserId,
    this.taskId,
    required this.reason,
    required this.description,
    this.evidence = const [],
    this.status = ReportStatus.pending,
    required this.createdAt,
  });

  factory ReportModel.fromMap(Map<String, dynamic> map, String docId) {
    return ReportModel(
      reportId: docId,
      reporterId: map['reporterId'] ?? '',
      reportedUserId: map['reportedUserId'] ?? '',
      taskId: map['taskId'],
      reason: ReportReason.values.firstWhere(
        (e) => e.name == map['reason'],
        orElse: () => ReportReason.other,
      ),
      description: map['description'] ?? '',
      evidence: List<String>.from(map['evidence'] ?? []),
      status: ReportStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => ReportStatus.pending,
      ),
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        map['createdAt'] ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'reporterId': reporterId,
      'reportedUserId': reportedUserId,
      if (taskId != null) 'taskId': taskId,
      'reason': reason.name,
      'description': description,
      'evidence': evidence,
      'status': status.name,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }

  ReportModel copyWith({
    String? reportId,
    String? reporterId,
    String? reportedUserId,
    String? taskId,
    ReportReason? reason,
    String? description,
    List<String>? evidence,
    ReportStatus? status,
    DateTime? createdAt,
  }) {
    return ReportModel(
      reportId: reportId ?? this.reportId,
      reporterId: reporterId ?? this.reporterId,
      reportedUserId: reportedUserId ?? this.reportedUserId,
      taskId: taskId ?? this.taskId,
      reason: reason ?? this.reason,
      description: description ?? this.description,
      evidence: evidence ?? this.evidence,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
