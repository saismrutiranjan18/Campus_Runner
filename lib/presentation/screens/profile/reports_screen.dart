// lib/presentation/screens/profile/reports_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:intl/intl.dart';

import '../../../data/models/report_model.dart';
import '../../../logic/report_provider.dart';

/// Admin-only screen to view and manage all user reports.
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final allReportsAsync = ref.watch(allReportsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
        actions: [
          // Badge showing pending count
          allReportsAsync.when(
            data: (reports) {
              final pendingCount =
                  reports.where((r) => r.status == ReportStatus.pending).length;
              if (pendingCount == 0) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Center(
                  child: Badge(
                    label: Text('$pendingCount'),
                    child: Icon(PhosphorIcons.flag()),
                  ),
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: allReportsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (reports) {
          if (reports.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    PhosphorIcons.shieldCheck(),
                    size: 64,
                    color: colors.primary.withValues(alpha: 0.4),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No reports',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Community is safe 🎉',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.onSurfaceVariant.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            );
          }

          // Sort: pending first, then by date desc
          final sorted = [...reports]..sort((a, b) {
              if (a.status == ReportStatus.pending &&
                  b.status != ReportStatus.pending) return -1;
              if (b.status == ReportStatus.pending &&
                  a.status != ReportStatus.pending) return 1;
              return b.createdAt.compareTo(a.createdAt);
            });

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: sorted.length,
            itemBuilder: (context, index) {
              return _ReportCard(report: sorted[index])
                  .animate()
                  .fade(
                    delay: Duration(milliseconds: index * 50),
                    duration: 300.ms,
                  )
                  .slideY(begin: 0.06, end: 0);
            },
          );
        },
      ),
    );
  }
}

class _ReportCard extends ConsumerWidget {
  final ReportModel report;

  const _ReportCard({required this.report});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final isPending = report.status == ReportStatus.pending;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: colors.surface.withValues(alpha: 0.8),
        border: Border.all(
          color: isPending
              ? colors.error.withValues(alpha: 0.4)
              : colors.outlineVariant.withValues(alpha: 0.3),
          width: isPending ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(99),
                    color: _statusColor(report.status, colors)
                        .withValues(alpha: 0.15),
                  ),
                  child: Text(
                    report.status.label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: _statusColor(report.status, colors),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(99),
                    color: colors.tertiaryContainer.withValues(alpha: 0.5),
                  ),
                  child: Text(
                    report.reason.label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colors.onTertiaryContainer,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  DateFormat('d MMM').format(report.createdAt),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // IDs
            _InfoRow(
              label: 'Reporter',
              value: report.reporterId,
              colors: colors,
              theme: theme,
            ),
            const SizedBox(height: 4),
            _InfoRow(
              label: 'Reported',
              value: report.reportedUserId,
              colors: colors,
              theme: theme,
            ),
            if (report.taskId != null) ...[
              const SizedBox(height: 4),
              _InfoRow(
                label: 'Task',
                value: report.taskId!,
                colors: colors,
                theme: theme,
              ),
            ],
            const SizedBox(height: 8),

            // Description
            Text(
              report.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurface.withValues(alpha: 0.85),
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),

            // Admin actions
            if (report.status == ReportStatus.pending) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  _ActionButton(
                    label: 'Mark Reviewed',
                    icon: PhosphorIcons.eye(),
                    color: colors.primary,
                    onTap: () => _updateStatus(
                      context,
                      ref,
                      report.reportId,
                      ReportStatus.reviewed,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _ActionButton(
                    label: 'Resolve',
                    icon: PhosphorIcons.checkCircle(),
                    color: Colors.green,
                    onTap: () => _updateStatus(
                      context,
                      ref,
                      report.reportId,
                      ReportStatus.resolved,
                    ),
                  ),
                ],
              ),
            ] else if (report.status == ReportStatus.reviewed) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  _ActionButton(
                    label: 'Resolve',
                    icon: PhosphorIcons.checkCircle(),
                    color: Colors.green,
                    onTap: () => _updateStatus(
                      context,
                      ref,
                      report.reportId,
                      ReportStatus.resolved,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(
    BuildContext context,
    WidgetRef ref,
    String reportId,
    ReportStatus status,
  ) async {
    try {
      await ref
          .read(reportRepositoryProvider)
          .updateReportStatus(reportId, status);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Report marked as ${status.label}')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Color _statusColor(ReportStatus status, ColorScheme colors) {
    switch (status) {
      case ReportStatus.pending:
        return colors.error;
      case ReportStatus.reviewed:
        return Colors.orange;
      case ReportStatus.resolved:
        return Colors.green;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final ColorScheme colors;
  final ThemeData theme;

  const _InfoRow({
    required this.label,
    required this.value,
    required this.colors,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '$label: ',
          style: theme.textTheme.labelSmall?.copyWith(
            color: colors.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.labelSmall?.copyWith(
              color: colors.onSurfaceVariant,
              fontFamily: 'monospace',
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16, color: color),
      label: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: color.withValues(alpha: 0.3)),
        ),
      ),
    );
  }
}
