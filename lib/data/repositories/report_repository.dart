// lib/data/repositories/report_repository.dart

import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/report_model.dart';
import '../../core/config/app_mode.dart';

class ReportRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ── CREATE ──────────────────────────────────────────────────────────────────

  Future<void> submitReport(ReportModel model) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('reports').add(model.toMap());
  }

  // ── READ ─────────────────────────────────────────────────────────────────────

  /// All reports (admin use), newest first.
  Stream<List<ReportModel>> getReports({ReportStatus? status}) {
    if (!AppMode.backendEnabled) return Stream.value([]);

    Query<Map<String, dynamic>> query =
        _firestore.collection('reports').orderBy('createdAt', descending: true);

    if (status != null) {
      query = _firestore
          .collection('reports')
          .where('status', isEqualTo: status.name)
          .orderBy('createdAt', descending: true);
    }

    return query
        .snapshots()
        .map((snap) =>
            snap.docs.map((d) => ReportModel.fromMap(d.data(), d.id)).toList());
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────

  Future<void> updateReportStatus(
      String reportId, ReportStatus newStatus) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('reports').doc(reportId).update({
      'status': newStatus.name,
    });
  }

  // ── BLOCK / UNBLOCK ──────────────────────────────────────────────────────────

  Future<void> blockUser(
      String currentUserId, String targetUserId) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(currentUserId).update({
      'blockedUsers': FieldValue.arrayUnion([targetUserId]),
    });
  }

  Future<void> unblockUser(
      String currentUserId, String targetUserId) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(currentUserId).update({
      'blockedUsers': FieldValue.arrayRemove([targetUserId]),
    });
  }
}
