import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../core/config/app_mode.dart';
import '../data/repositories/user_repository.dart';
import '../data/models/user_model.dart';

final userRepositoryProvider = Provider((ref) => UserRepository());

final currentUserProfileProvider = StreamProvider<UserModel?>((ref) {
  if (!AppMode.backendEnabled) {
    return Stream.value(null);
  }

  final authUser = FirebaseAuth.instance.currentUser;

  if (authUser == null) {
    return Stream.value(null);
  }

  return ref.watch(userRepositoryProvider).getUserProfileStream(authUser.uid);
});

final userProfileProvider = StreamProvider.family<UserModel?, String>((
  ref,
  userId,
) {
  return ref.watch(userRepositoryProvider).getUserProfileStream(userId);
});

final leaderboardProvider = StreamProvider<List<UserModel>>((ref) {
  final repo = ref.watch(userRepositoryProvider);

  return repo.getAllUsersStream().map((users) {
    users.sort((a, b) => (b.completedTasks ?? 0).compareTo(a.completedTasks ?? 0));
    return users;
  });
});
