// lib/data/models/task_model.dart

class TaskModel {
  final String id;
  final String requesterId;
  final String? runnerId;
  final String title;
  final String pickup;
  final String drop;
  final String price;
  final String status;
  final DateTime createdAt;
  final String campusId;
  final String campusName;
  final String transportMode;
  final String? fileUrl;
  final double? runnerLatitude;
  final double? runnerLongitude;
  final DateTime? locationLastUpdated;
  final DateTime? acceptedAt;
  final DateTime? completedAt;
  final String? runnerName;
  final String? runnerPhone;
  final bool paymentVerified;

  TaskModel({
    required this.id,
    required this.requesterId,
    this.runnerId,
    required this.title,
    required this.pickup,
    required this.drop,
    required this.price,
    required this.status,
    required this.createdAt,
    required this.campusId,
    required this.campusName,
    required this.transportMode,
    this.fileUrl,
    this.runnerLatitude,
    this.runnerLongitude,
    this.locationLastUpdated,
    this.acceptedAt,
    this.completedAt,
    this.runnerName,
    this.runnerPhone,
    this.paymentVerified = false,
  });

  factory TaskModel.fromMap(Map<String, dynamic> map, String docId) {
    return TaskModel(
      id: docId,
      requesterId: map['requesterId'] ?? '',
      runnerId: map['runnerId'],
      title: map['title'] ?? '',
      pickup: map['pickup'] ?? '',
      drop: map['drop'] ?? '',
      price: map['price'] ?? '0',
      status: map['status'] ?? 'OPEN',
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['createdAt'] ?? 0),
      campusId: map['campusId'] ?? 'unknown',
      campusName: map['campusName'] ?? 'Unknown Campus',
      transportMode: map['transportMode'] ?? 'Walking',
      fileUrl: map['fileUrl'],
      runnerLatitude: map['runnerLatitude']?.toDouble(),
      runnerLongitude: map['runnerLongitude']?.toDouble(),
      locationLastUpdated: map['locationLastUpdated'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['locationLastUpdated'])
          : null,
      acceptedAt: map['acceptedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['acceptedAt'])
          : null,
      completedAt: map['completedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['completedAt'])
          : null,
      runnerName: map['runnerName'],
      runnerPhone: map['runnerPhone'],
      paymentVerified: map['paymentVerified'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'requesterId': requesterId,
      if (runnerId != null) 'runnerId': runnerId,
      'title': title,
      'pickup': pickup,
      'drop': drop,
      'price': price,
      'status': status,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'campusId': campusId,
      'campusName': campusName,
      'transportMode': transportMode,
      if (fileUrl != null) 'fileUrl': fileUrl,
      if (runnerLatitude != null) 'runnerLatitude': runnerLatitude,
      if (runnerLongitude != null) 'runnerLongitude': runnerLongitude,
      if (locationLastUpdated != null)
        'locationLastUpdated': locationLastUpdated!.millisecondsSinceEpoch,
      if (acceptedAt != null)
        'acceptedAt': acceptedAt!.millisecondsSinceEpoch,
      if (completedAt != null)
        'completedAt': completedAt!.millisecondsSinceEpoch,
      if (runnerName != null) 'runnerName': runnerName,
      if (runnerPhone != null) 'runnerPhone': runnerPhone,
      'paymentVerified': paymentVerified,
    };
  }
}
