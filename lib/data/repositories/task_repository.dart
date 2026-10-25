import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/config/app_mode.dart';
import '../models/task_model.dart';
import '../services/pagination_helper.dart';

class TaskRepository {
  static final List<TaskModel> _demoTasks = [
    TaskModel(
      id: 'demo-1',
      requesterId: 'demo-user',
      title: 'Print assignment notes',
      pickup: 'Stationery Shop',
      drop: 'Boys Hostel A',
      price: '40',
      status: 'OPEN',
      createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
      campusId: 'vit-bhopal',
      campusName: 'VIT Bhopal',
      transportMode: 'Walking',
    ),
    TaskModel(
      id: 'demo-2',
      requesterId: 'demo-user',
      title: 'Deliver lunch parcel',
      pickup: 'Main Canteen',
      drop: 'Girls Hostel C',
      price: '60',
      status: 'OPEN',
      createdAt: DateTime.now().subtract(const Duration(minutes: 35)),
      campusId: 'vit-bhopal',
      campusName: 'VIT Bhopal',
      transportMode: 'Cycling',
    ),
  ];
  static final StreamController<int> _demoTasksTicker =
      StreamController<int>.broadcast();

  List<TaskModel> _filterDemoOpenTasks(String? campusId) {
    var items = _demoTasks.where((task) => task.status == 'OPEN').toList();
    if (campusId != null && campusId.isNotEmpty && campusId != 'all') {
      items = items.where((task) => task.campusId == campusId).toList();
    }
    items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  // 1. CREATE
  Future<void> addTask(TaskModel task) async {
    if (!AppMode.backendEnabled) {
      _demoTasks.add(
        TaskModel(
          id: 'demo-${DateTime.now().millisecondsSinceEpoch}',
          requesterId: task.requesterId,
          title: task.title,
          pickup: task.pickup,
          drop: task.drop,
          price: task.price,
          status: task.status,
          createdAt: task.createdAt,
          campusId: task.campusId,
          campusName: task.campusName,
          transportMode: task.transportMode,
          fileUrl: task.fileUrl,
        ),
      );
      _demoTasksTicker.add(_demoTasks.length);
      return;
    }

    final firestore = FirebaseFirestore.instance;
    await firestore.collection('tasks').add(task.toMap());
  }

  // 2. READ (Stream)
  Stream<List<TaskModel>> getOpenTasks({String? campusId}) {
    if (!AppMode.backendEnabled) {
      return Stream<List<TaskModel>>.multi((controller) {
        controller.add(_filterDemoOpenTasks(campusId));
        final sub = _demoTasksTicker.stream.listen((_) {
          controller.add(_filterDemoOpenTasks(campusId));
        });
        controller.onCancel = sub.cancel;
      });
    }

    final firestore = FirebaseFirestore.instance;
    var query = firestore
        .collection('tasks')
        .where('status', isEqualTo: 'OPEN');

    if (campusId != null && campusId.isNotEmpty && campusId != 'all') {
      query = query.where('campusId', isEqualTo: campusId);
    }

    return query.orderBy('createdAt', descending: true).snapshots().map((
      snapshot,
    ) {
      return snapshot.docs.map((doc) {
        return TaskModel.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  Future<void> acceptTask({
    required String taskId,
    required String runnerId,
    required String runnerName,
    required String runnerPhone,
  }) async {
    if (!AppMode.backendEnabled) {
      final index = _demoTasks.indexWhere((task) => task.id == taskId);
      if (index == -1) return;
      final old = _demoTasks[index];
      _demoTasks[index] = TaskModel(
        id: old.id,
        requesterId: old.requesterId,
        runnerId: runnerId,
        title: old.title,
        pickup: old.pickup,
        drop: old.drop,
        price: old.price,
        status: 'IN_PROGRESS',
        createdAt: old.createdAt,
        campusId: old.campusId,
        campusName: old.campusName,
        transportMode: old.transportMode,
        fileUrl: old.fileUrl,
        acceptedAt: DateTime.now(),
        runnerName: runnerName,
        runnerPhone: runnerPhone,
      );
      _demoTasksTicker.add(_demoTasks.length);
      return;
    }

    final firestore = FirebaseFirestore.instance;

    await firestore.runTransaction((transaction) async {
      final taskRef = firestore.collection('tasks').doc(taskId);
      final taskSnapshot = await transaction.get(taskRef);

      if (!taskSnapshot.exists) {
        throw Exception('Task not found');
      }

      final taskData = taskSnapshot.data()!;
      final currentStatus = taskData['status'];

      if (currentStatus != 'OPEN') {
        throw Exception('Task is no longer available');
      }

      if (taskData['runnerId'] != null) {
        throw Exception('Task already has a runner assigned');
      }

      transaction.update(taskRef, {
        'status': 'IN_PROGRESS',
        'runnerId': runnerId,
        'runnerName': runnerName,
        'runnerPhone': runnerPhone,
        'acceptedAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> updateTaskStatus(
    String taskId,
    String newStatus, {
    String? runnerId,
    bool? paymentVerified,
  }) async {
    if (!AppMode.backendEnabled) {
      final index = _demoTasks.indexWhere((task) => task.id == taskId);
      if (index == -1) return;
      final old = _demoTasks[index];
      _demoTasks[index] = TaskModel(
        id: old.id,
        requesterId: old.requesterId,
        runnerId: runnerId ?? old.runnerId,
        title: old.title,
        pickup: old.pickup,
        drop: old.drop,
        price: old.price,
        status: newStatus,
        createdAt: old.createdAt,
        campusId: old.campusId,
        campusName: old.campusName,
        transportMode: old.transportMode,
        fileUrl: old.fileUrl,
        completedAt: newStatus == 'COMPLETED' ? DateTime.now() : old.completedAt,
        acceptedAt: old.acceptedAt,
        runnerName: old.runnerName,
        runnerPhone: old.runnerPhone,
        paymentVerified: paymentVerified ?? old.paymentVerified,
      );
      _demoTasksTicker.add(_demoTasks.length);
      return;
    }

    try {
      final firestore = FirebaseFirestore.instance;
      final updateData = <String, dynamic>{'status': newStatus};
      
      if (runnerId != null) {
        updateData['runnerId'] = runnerId;
      }
      
      if (newStatus == 'COMPLETED') {
        updateData['completedAt'] = FieldValue.serverTimestamp();
      }
      
      if (paymentVerified != null) {
        updateData['paymentVerified'] = paymentVerified;
      }
      
      await firestore.collection('tasks').doc(taskId).update(updateData);
    } catch (e) {
      throw Exception('Failed to update task: $e');
    }
  }

  Stream<List<TaskModel>> getTasksByRunner(String runnerId) {
    if (!AppMode.backendEnabled) {
      return Stream.value([]);
    }

    return FirebaseFirestore.instance
        .collection('tasks')
        .where('runnerId', isEqualTo: runnerId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return TaskModel.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  Stream<List<TaskModel>> getTasksByRequester(String requesterId) {
    if (!AppMode.backendEnabled) {
      return Stream.value([]);
    }

    return FirebaseFirestore.instance
        .collection('tasks')
        .where('requesterId', isEqualTo: requesterId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return TaskModel.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  PaginationHelper<TaskModel> createTasksPagination({
    String? campusId,
    String? status,
    String? runnerId,
    String? requesterId,
  }) {
    return PaginationHelper<TaskModel>(
      queryBuilder: () {
        var query = FirebaseFirestore.instance.collection('tasks').where(
              'status',
              isEqualTo: status ?? 'OPEN',
            );

        if (campusId != null && campusId.isNotEmpty && campusId != 'all') {
          query = query.where('campusId', isEqualTo: campusId);
        }

        if (runnerId != null) {
          query = query.where('runnerId', isEqualTo: runnerId);
        }

        if (requesterId != null) {
          query = query.where('requesterId', isEqualTo: requesterId);
        }

        return query.orderBy('createdAt', descending: true);
      },
      itemBuilder: (doc) =>
          TaskModel.fromMap(doc.data() as Map<String, dynamic>, doc.id),
    );
  }

  Future<TaskModel?> getTaskById(String taskId) async {
    if (!AppMode.backendEnabled) {
      try {
        return _demoTasks.firstWhere((task) => task.id == taskId);
      } catch (e) {
        return null;
      }
    }

    final doc = await FirebaseFirestore.instance
        .collection('tasks')
        .doc(taskId)
        .get();

    if (!doc.exists) return null;

    return TaskModel.fromMap(doc.data()!, doc.id);
  }
}
