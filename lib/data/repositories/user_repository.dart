import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/config/app_mode.dart';
import '../models/user_model.dart';

class UserRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> createUserProfile(UserModel user) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(user.userId).set(user.toMap());
  }

  Future<UserModel?> getUserProfile(String userId) async {
    if (!AppMode.backendEnabled) return null;

    final doc = await _firestore.collection('users').doc(userId).get();

    if (!doc.exists) return null;

    return UserModel.fromMap(doc.data()!, doc.id);
  }

  Stream<UserModel?> getUserProfileStream(String userId) {
    if (!AppMode.backendEnabled) {
      return Stream.value(null);
    }

    return _firestore
        .collection('users')
        .doc(userId)
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      return UserModel.fromMap(doc.data()!, doc.id);
    });
  }

  Future<void> updateUserProfile(String userId, Map<String, dynamic> updates) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(userId).update(updates);
  }

  Future<void> verifyPhone(String userId) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(userId).update({
      'isVerified': true,
    });
  }

  Future<void> updateFCMToken(String userId, String token) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(userId).update({
      'fcmToken': token,
    });
  }

  Future<void> incrementCompletedTasks(String userId) async {
    if (!AppMode.backendEnabled) return;

    await _firestore.collection('users').doc(userId).update({
      'completedTasks': FieldValue.increment(1),
    });
  }

  Future<void> updateRating(String userId, double newRating) async {
    if (!AppMode.backendEnabled) return;

    final userDoc = await _firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    final currentRating = (userDoc.data()?['rating'] ?? 0.0).toDouble();
    final currentTotal = userDoc.data()?['totalRatings'] ?? 0;

    final totalRatings = currentTotal + 1;
    final updatedRating = ((currentRating * currentTotal) + newRating) / totalRatings;

    await _firestore.collection('users').doc(userId).update({
      'rating': updatedRating,
      'totalRatings': totalRatings,
    });
  }

  Future<bool> userExists(String userId) async {
    if (!AppMode.backendEnabled) return false;

    final doc = await _firestore.collection('users').doc(userId).get();
    return doc.exists;
  }
}
