// lib/data/repositories/rating_repository.dart

import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/rating_model.dart';
import '../../core/config/app_mode.dart';

class RatingRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ── CREATE ──────────────────────────────────────────────────────────────────

  /// Submit a new rating. Also updates the ratee's aggregate rating atomically.
  Future<void> submitRating(RatingModel model) async {
    if (!AppMode.backendEnabled) return;

    // Use taskId + raterId as document ID to enforce one rating per task per rater.
    final docId = '${model.taskId}_${model.raterId}';
    final ratingRef = _firestore.collection('ratings').doc(docId);
    final userRef = _firestore.collection('users').doc(model.rateeId);

    await _firestore.runTransaction((tx) async {
      final userSnap = await tx.get(userRef);
      if (!userSnap.exists) return;

      final data = userSnap.data()!;
      final currentRating = (data['rating'] ?? 0.0).toDouble();
      final currentTotal = (data['totalRatings'] ?? 0) as int;

      final newTotal = currentTotal + 1;
      // Weighted average (equal weight for now; extend with recency weights if desired)
      final newRating =
          ((currentRating * currentTotal) + model.rating) / newTotal;

      tx.set(ratingRef, model.copyWith(ratingId: docId).toMap());
      tx.update(userRef, {
        'rating': double.parse(newRating.toStringAsFixed(2)),
        'totalRatings': newTotal,
        // Auto-suspend if rating drops below 3.0 and they have at least 5 reviews
        if (newRating < 3.0 && newTotal >= 5) 'isSuspended': true,
      });
    });
  }

  // ── READ ─────────────────────────────────────────────────────────────────────

  /// Stream of all ratings received by a user, newest first.
  Stream<List<RatingModel>> getRatingsForUser(String userId) {
    if (!AppMode.backendEnabled) return Stream.value([]);

    return _firestore
        .collection('ratings')
        .where('rateeId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map((d) => RatingModel.fromMap(d.data(), d.id)).toList());
  }

  /// Check whether the current user has already rated a task.
  Future<RatingModel?> getRatingForTask(String taskId, String raterId) async {
    if (!AppMode.backendEnabled) return null;

    final docId = '${taskId}_$raterId';
    final doc = await _firestore.collection('ratings').doc(docId).get();
    if (!doc.exists) return null;
    return RatingModel.fromMap(doc.data()!, doc.id);
  }

  /// Update an existing rating (only within the 24-hour edit window).
  Future<void> updateRating(RatingModel updated) async {
    if (!AppMode.backendEnabled) return;
    if (!updated.canEdit) {
      throw Exception('Rating can no longer be edited (24-hour window expired).');
    }

    final docId = '${updated.taskId}_${updated.raterId}';
    final ratingRef = _firestore.collection('ratings').doc(docId);
    final userRef = _firestore.collection('users').doc(updated.rateeId);

    await _firestore.runTransaction((tx) async {
      final oldSnap = await tx.get(ratingRef);
      if (!oldSnap.exists) throw Exception('Rating not found.');

      final oldRating = RatingModel.fromMap(oldSnap.data()!, oldSnap.id);

      final userSnap = await tx.get(userRef);
      if (!userSnap.exists) return;
      final data = userSnap.data()!;
      final currentRating = (data['rating'] ?? 0.0).toDouble();
      final currentTotal = (data['totalRatings'] ?? 1) as int;

      // Remove old rating contribution and add new one
      final newRating = currentTotal == 1
          ? updated.rating.toDouble()
          : ((currentRating * currentTotal) - oldRating.rating + updated.rating) /
              currentTotal;

      tx.update(ratingRef, {
        'rating': updated.rating,
        if (updated.review != null) 'review': updated.review,
        'categories': updated.categories,
        'isEdited': true,
        'editedAt': DateTime.now().millisecondsSinceEpoch,
      });
      tx.update(userRef, {
        'rating': double.parse(newRating.toStringAsFixed(2)),
        if (newRating < 3.0 && currentTotal >= 5) 'isSuspended': true,
        if (newRating >= 3.0) 'isSuspended': false,
      });
    });
  }

  /// Returns a map of {starValue: count} for a user's received ratings.
  Future<Map<int, int>> getUserRatingBreakdown(String userId) async {
    if (!AppMode.backendEnabled) return {};

    final snap = await _firestore
        .collection('ratings')
        .where('rateeId', isEqualTo: userId)
        .get();

    final breakdown = <int, int>{1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    for (final doc in snap.docs) {
      final r = RatingModel.fromMap(doc.data(), doc.id);
      breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
    }
    return breakdown;
  }
}
