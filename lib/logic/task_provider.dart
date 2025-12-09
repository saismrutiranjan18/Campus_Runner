import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/task_repository.dart';
import '../data/models/task_model.dart';

// 1. Simple Provider for the Repository
final taskRepositoryProvider = Provider((ref) => TaskRepository());

// 2. Stream Provider for the List of Tasks
// The UI listens to this. If Firebase changes, this updates automatically.
final tasksStreamProvider = StreamProvider<List<TaskModel>>((ref) {
  final repository = ref.watch(taskRepositoryProvider);
  return repository.getOpenTasks();
});