// lib/data/models/rating_model.dart

class RatingModel {
  final String ratingId;
  final String taskId;
  final String raterId;
  final String rateeId;
  final int rating; // 1–5
  final String? review;
  final List<String> categories;
  final DateTime createdAt;
  final bool isEdited;
  final DateTime? editedAt;

  const RatingModel({
    required this.ratingId,
    required this.taskId,
    required this.raterId,
    required this.rateeId,
    required this.rating,
    this.review,
    this.categories = const [],
    required this.createdAt,
    this.isEdited = false,
    this.editedAt,
  });

  factory RatingModel.fromMap(Map<String, dynamic> map, String docId) {
    return RatingModel(
      ratingId: docId,
      taskId: map['taskId'] ?? '',
      raterId: map['raterId'] ?? '',
      rateeId: map['rateeId'] ?? '',
      rating: (map['rating'] ?? 1).toInt(),
      review: map['review'],
      categories: List<String>.from(map['categories'] ?? []),
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        map['createdAt'] ?? DateTime.now().millisecondsSinceEpoch,
      ),
      isEdited: map['isEdited'] ?? false,
      editedAt: map['editedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['editedAt'])
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'taskId': taskId,
      'raterId': raterId,
      'rateeId': rateeId,
      'rating': rating,
      if (review != null && review!.isNotEmpty) 'review': review,
      'categories': categories,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'isEdited': isEdited,
      if (editedAt != null) 'editedAt': editedAt!.millisecondsSinceEpoch,
    };
  }

  RatingModel copyWith({
    String? ratingId,
    String? taskId,
    String? raterId,
    String? rateeId,
    int? rating,
    String? review,
    List<String>? categories,
    DateTime? createdAt,
    bool? isEdited,
    DateTime? editedAt,
  }) {
    return RatingModel(
      ratingId: ratingId ?? this.ratingId,
      taskId: taskId ?? this.taskId,
      raterId: raterId ?? this.raterId,
      rateeId: rateeId ?? this.rateeId,
      rating: rating ?? this.rating,
      review: review ?? this.review,
      categories: categories ?? this.categories,
      createdAt: createdAt ?? this.createdAt,
      isEdited: isEdited ?? this.isEdited,
      editedAt: editedAt ?? this.editedAt,
    );
  }

  /// Whether this rating can still be edited (within 24 hours of creation).
  bool get canEdit {
    final diff = DateTime.now().difference(createdAt);
    return diff.inHours < 24;
  }
}
