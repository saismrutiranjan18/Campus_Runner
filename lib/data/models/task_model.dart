// lib/data/models/task_model.dart

class TaskModel {
  final String id;
  final String requesterId;
<<<<<<< HEAD
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
=======
  final String? runnerId; // Runner who accepted the task (Optional)
  final String title;
  final String pickup;
  final String drop;
  
  // --- MAJOR CHANGE: Price must be a double for calculations ---
  final double price; 
  
  final String status; // 'OPEN', 'IN_PROGRESS', 'COMPLETED'
  
  // --- NEW DATE/TIME FIELDS ---
  final DateTime createdAt;
  final DateTime? acceptedAt; // When runner accepted it
  final DateTime? completedAt; // When task was finished
  
  // File URL is optional
  final String? fileUrl; 
>>>>>>> b96398b (local changes)

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
<<<<<<< HEAD
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
=======
    this.acceptedAt,
    this.completedAt,
    this.fileUrl, 
>>>>>>> b96398b (local changes)
  });

  factory TaskModel.fromMap(Map<String, dynamic> map, String docId) {
    return TaskModel(
      id: docId,
<<<<<<< HEAD
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
=======
      requesterId: map['requesterId'] as String? ?? '',
      runnerId: map['runnerId'] as String?, // Optional field
      title: map['title'] as String? ?? '',
      pickup: map['pickup'] as String? ?? '',
      drop: map['drop'] as String? ?? '',
      
      // Handle price conversion (Number or String to double)
      price: map['price'] is num 
          ? (map['price'] as num).toDouble() 
          : double.tryParse(map['price'] as String? ?? '0') ?? 0.0,
          
      status: map['status'] as String? ?? 'OPEN',
      
      // Handle DateTime fields (Firestore stores millisecondsSinceEpoch)
      createdAt: map['createdAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'] as int)
          : DateTime.now(),
      acceptedAt: map['acceptedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['acceptedAt'] as int)
          : null,
      completedAt: map['completedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['completedAt'] as int)
          : null,
          
      fileUrl: map['fileUrl'] as String?, 
>>>>>>> b96398b (local changes)
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'requesterId': requesterId,
<<<<<<< HEAD
      if (runnerId != null) 'runnerId': runnerId,
=======
      'runnerId': runnerId,
>>>>>>> b96398b (local changes)
      'title': title,
      'pickup': pickup,
      'drop': drop,
      'price': price,
      'status': status,
      
      // Convert DateTime to millisecondsSinceEpoch (int) for Firestore
      'createdAt': createdAt.millisecondsSinceEpoch,
<<<<<<< HEAD
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
=======
      'acceptedAt': acceptedAt?.millisecondsSinceEpoch,
      'completedAt': completedAt?.millisecondsSinceEpoch,
      
      'fileUrl': fileUrl, 
>>>>>>> b96398b (local changes)
    };
  }
}
