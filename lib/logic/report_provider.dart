// lib/logic/report_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/report_repository.dart';
import '../data/models/report_model.dart';

final reportRepositoryProvider = Provider<ReportRepository>(
  (ref) => ReportRepository(),
);

/// All reports (admin dashboard).
final allReportsProvider = StreamProvider<List<ReportModel>>((ref) {
  return ref.watch(reportRepositoryProvider).getReports();
});

/// Only pending reports (for the admin badge/alert).
final pendingReportsProvider = StreamProvider<List<ReportModel>>((ref) {
  return ref
      .watch(reportRepositoryProvider)
      .getReports(status: ReportStatus.pending);
});
