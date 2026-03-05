// lib/presentation/widgets/dialogs/rating_dialog.dart

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../data/models/rating_model.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/rating_provider.dart';

/// Category labels by rater role.
const _runnerCategories = ['Punctual', 'Polite', 'Professional', 'Careful'];
const _requesterCategories = [
  'Clear Instructions',
  'Fair Payment',
  'Respectful',
  'Responsive',
];

/// Show the rating dialog. Call this after a task is completed.
///
/// [taskId]   – the completed task's ID
/// [rateeId]  – the user being rated
/// [rateeName] – display name of the person being rated
/// [isRatingRunner] – true when requester rates runner, false vice-versa
///
/// Returns `true` if a rating was successfully submitted.
Future<bool?> showRatingDialog(
  BuildContext context, {
  required String taskId,
  required String rateeId,
  required String rateeeName,
  required bool isRatingRunner,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => UncontrolledProviderScope(
      container: ProviderScope.containerOf(context),
      child: _RatingSheet(
        taskId: taskId,
        rateeId: rateeId,
        rateeeName: rateeeName,
        isRatingRunner: isRatingRunner,
      ),
    ),
  );
}

class _RatingSheet extends ConsumerStatefulWidget {
  final String taskId;
  final String rateeId;
  final String rateeeName;
  final bool isRatingRunner;

  const _RatingSheet({
    required this.taskId,
    required this.rateeId,
    required this.rateeeName,
    required this.isRatingRunner,
  });

  @override
  ConsumerState<_RatingSheet> createState() => _RatingSheetState();
}

class _RatingSheetState extends ConsumerState<_RatingSheet> {
  int _stars = 0;
  final Set<String> _selectedCategories = {};
  final _reviewController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  List<String> get _categories =>
      widget.isRatingRunner ? _runnerCategories : _requesterCategories;

  Future<void> _submit() async {
    if (_stars == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a star rating')),
      );
      return;
    }

    setState(() => _loading = true);

    try {
      final currentUser =
          ref.read(authRepositoryProvider).getCurrentUser();
      if (currentUser == null) throw Exception('Not signed in');

      final model = RatingModel(
        ratingId: '',
        taskId: widget.taskId,
        raterId: currentUser.uid,
        rateeId: widget.rateeId,
        rating: _stars,
        review: _reviewController.text.trim().isEmpty
            ? null
            : _reviewController.text.trim(),
        categories: _selectedCategories.toList(),
        createdAt: DateTime.now(),
      );

      await ref.read(ratingRepositoryProvider).submitRating(model);

      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit rating: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, controller) {
        return Container(
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // Handle bar
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colors.onSurfaceVariant.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: controller,
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                  children: [
                    // Title
                    Text(
                      'Rate ${widget.rateeeName}',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ).animate().fade(duration: 300.ms),
                    const SizedBox(height: 6),
                    Text(
                      widget.isRatingRunner
                          ? 'How was your runner?'
                          : 'How was the requester?',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ).animate().fade(delay: 80.ms, duration: 300.ms),
                    const SizedBox(height: 28),

                    // Star selector
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (i) {
                        final filled = i < _stars;
                        return GestureDetector(
                          onTap: () => setState(() => _stars = i + 1),
                          child: Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(
                              filled
                                  ? Icons.star
                                  : PhosphorIcons.star(),
                              size: 44,
                              color: filled
                                  ? Colors.amber
                                  : colors.onSurfaceVariant
                                      .withValues(alpha: 0.4),
                            )
                                .animate(target: filled ? 1 : 0)
                                .scale(
                                  begin: const Offset(1, 1),
                                  end: const Offset(1.2, 1.2),
                                  duration: 150.ms,
                                  curve: Curves.elasticOut,
                                ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 8),
                    if (_stars > 0)
                      Text(
                        _starLabel(_stars),
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: colors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ).animate().fadeIn(duration: 200.ms),
                    const SizedBox(height: 24),

                    // Category chips
                    Text(
                      'What stood out?',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _categories.map((cat) {
                        final selected = _selectedCategories.contains(cat);
                        return FilterChip(
                          label: Text(cat),
                          selected: selected,
                          onSelected: (val) {
                            setState(() {
                              if (val) {
                                _selectedCategories.add(cat);
                              } else {
                                _selectedCategories.remove(cat);
                              }
                            });
                          },
                          selectedColor:
                              colors.primaryContainer.withValues(alpha: 0.8),
                          checkmarkColor: colors.onPrimaryContainer,
                          labelStyle: TextStyle(
                            color: selected
                                ? colors.onPrimaryContainer
                                : colors.onSurfaceVariant,
                            fontWeight: selected
                                ? FontWeight.w700
                                : FontWeight.normal,
                          ),
                          side: BorderSide(
                            color: selected
                                ? colors.primary.withValues(alpha: 0.4)
                                : colors.outlineVariant.withValues(alpha: 0.4),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),

                    // Written review
                    Text(
                      'Leave a review (optional)',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _reviewController,
                      maxLines: 4,
                      maxLength: 400,
                      decoration: InputDecoration(
                        hintText: 'Describe your experience…',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Submit
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _loading ? null : _submit,
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Submit Rating',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ).animate().fade(delay: 200.ms, duration: 300.ms),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

String _starLabel(int stars) {
  switch (stars) {
    case 1:
      return 'Poor 😞';
    case 2:
      return 'Below Average 😕';
    case 3:
      return 'Average 😐';
    case 4:
      return 'Good 😊';
    case 5:
      return 'Excellent! 🌟';
    default:
      return '';
  }
}
