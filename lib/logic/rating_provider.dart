// lib/logic/rating_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/rating_repository.dart';
import '../data/models/rating_model.dart';

final ratingRepositoryProvider = Provider<RatingRepository>(
  (ref) => RatingRepository(),
);

/// Stream of all ratings received by [userId].
final userRatingsProvider =
    StreamProvider.family<List<RatingModel>, String>((ref, userId) {
  return ref.watch(ratingRepositoryProvider).getRatingsForUser(userId);
});

/// Whether the current user has already rated [taskId].
/// Family key is a record-style string: '{taskId}_{raterId}'.
final taskRatingProvider =
    FutureProvider.family<RatingModel?, String>((ref, key) {
  final parts = key.split('|');
  if (parts.length != 2) return Future.value(null);
  return ref
      .watch(ratingRepositoryProvider)
      .getRatingForTask(parts[0], parts[1]);
});

/// Star breakdown map {1: count, 2: count, …, 5: count} for [userId].
final userRatingBreakdownProvider =
    FutureProvider.family<Map<int, int>, String>((ref, userId) {
  return ref.watch(ratingRepositoryProvider).getUserRatingBreakdown(userId);
});
