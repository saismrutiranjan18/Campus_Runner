// lib/presentation/widgets/cards/recent_reviews_widget.dart

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:intl/intl.dart';

import '../../../data/models/rating_model.dart';
import '../../../logic/rating_provider.dart';

/// Displays recent reviews a user has received (up to [limit]).
class RecentReviewsWidget extends ConsumerWidget {
  final String userId;
  final int limit;

  const RecentReviewsWidget({
    super.key,
    required this.userId,
    this.limit = 5,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ratingsAsync = ref.watch(userRatingsProvider(userId));
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return ratingsAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
      error: (e, _) => const SizedBox.shrink(),
      data: (ratings) {
        if (ratings.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: colors.surface.withValues(alpha: 0.7),
              border: Border.all(
                color: colors.outlineVariant.withValues(alpha: 0.3),
              ),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    PhosphorIcons.chatCircle(),
                    size: 36,
                    color: colors.onSurfaceVariant.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'No reviews yet',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        final visible = ratings.take(limit).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                'Recent Reviews',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 10),
            ...List.generate(visible.length, (i) {
              return _ReviewCard(rating: visible[i])
                  .animate()
                  .fade(delay: Duration(milliseconds: i * 60), duration: 300.ms)
                  .slideY(begin: 0.06, end: 0);
            }),
          ],
        );
      },
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final RatingModel rating;

  const _ReviewCard({required this.rating});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final initials = rating.raterId.substring(0, 2).toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: colors.surface.withValues(alpha: 0.7),
        border: Border.all(
          color: colors.outlineVariant.withValues(alpha: 0.28),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: avatar + stars + date
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: colors.primaryContainer,
                child: Text(
                  initials,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: colors.onPrimaryContainer,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StarRow(stars: rating.rating, small: true),
                    const SizedBox(height: 2),
                    Text(
                      DateFormat('d MMM yyyy').format(rating.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (rating.isEdited)
                Text(
                  'edited',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.onSurfaceVariant.withValues(alpha: 0.6),
                    fontStyle: FontStyle.italic,
                  ),
                ),
            ],
          ),

          // Category chips
          if (rating.categories.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: rating.categories
                  .map(
                    (cat) => Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(99),
                        color: colors.primaryContainer.withValues(alpha: 0.5),
                      ),
                      child: Text(
                        cat,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colors.onPrimaryContainer,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],

          // Review text
          if (rating.review != null && rating.review!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              rating.review!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurface.withValues(alpha: 0.85),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StarRow extends StatelessWidget {
  final int stars;
  final bool small;

  const _StarRow({required this.stars, this.small = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        return Icon(
          i < stars ? Icons.star : PhosphorIcons.star(),
          size: small ? 14 : 18,
          color: i < stars
              ? Colors.amber
              : Theme.of(context)
                  .colorScheme
                  .onSurfaceVariant
                  .withValues(alpha: 0.3),
        );
      }),
    );
  }
}
