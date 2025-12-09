import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/task_model.dart';

class TaskRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // 1. CREATE
  Future<void> addTask(TaskModel task) async {
    await _firestore.collection('tasks').add(task.toMap());
  }

  // 2. READ (Stream)
  Stream<List<TaskModel>> getOpenTasks() {
    return _firestore
        .collection('tasks')
        .where('status', isEqualTo: 'OPEN') 
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return TaskModel.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  // 3. UPDATE (Accept or Complete Task) - NEW CODE
  Future<void> updateTaskStatus(String taskId, String newStatus) async {
    try {
      await _firestore.collection('tasks').doc(taskId).update({
        'status': newStatus,
      });
    } catch (e) {
      throw Exception('Failed to update task: $e');
    }
  }
}