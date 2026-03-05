// lib/presentation/widgets/cards/rating_breakdown_widget.dart

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../logic/rating_provider.dart';

/// Displays a user's aggregate star rating as a compact breakdown bar chart.
class RatingBreakdownWidget extends ConsumerWidget {
  final String userId;
  final double rating;
  final int totalRatings;

  const RatingBreakdownWidget({
    super.key,
    required this.userId,
    required this.rating,
    required this.totalRatings,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final breakdownAsync = ref.watch(userRatingBreakdownProvider(userId));
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: colors.surface.withValues(alpha: 0.7),
        border: Border.all(
          color: colors.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Rating Breakdown',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Big rating badge
              Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Icon(
                        Icons.star,
                        color: Colors.amber,
                        size: 22,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        rating.toStringAsFixed(1),
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: colors.onSurface,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '$totalRatings ${totalRatings == 1 ? 'review' : 'reviews'}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              // Bar chart
              Expanded(
                child: breakdownAsync.when(
                  loading: () => const SizedBox(
                    height: 80,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  ),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (breakdown) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(5, (i) {
                        final star = 5 - i; // 5 down to 1
                        final count = breakdown[star] ?? 0;
                        final fraction =
                            totalRatings == 0 ? 0.0 : count / totalRatings;
                        return _BarRow(
                          star: star,
                          fraction: fraction,
                          count: count,
                        );
                      }),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fade(duration: 350.ms).slideY(begin: 0.06, end: 0);
  }
}

class _BarRow extends StatelessWidget {
  final int star;
  final double fraction;
  final int count;

  const _BarRow({
    required this.star,
    required this.fraction,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(
            '$star',
            style: TextStyle(
              fontSize: 11,
              color: colors.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          Icon(Icons.star, size: 10, color: Colors.amber),
          const SizedBox(width: 6),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  children: [
                    Container(
                      height: 7,
                      width: constraints.maxWidth,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(99),
                        color: colors.surfaceContainerHighest
                            .withValues(alpha: 0.5),
                      ),
                    ),
                    AnimatedContainer(
                      duration: 600.ms,
                      curve: Curves.easeOutCubic,
                      height: 7,
                      width: constraints.maxWidth * fraction,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(99),
                        color: Colors.amber,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(width: 6),
          SizedBox(
            width: 20,
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 11,
                color: colors.onSurfaceVariant,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}
