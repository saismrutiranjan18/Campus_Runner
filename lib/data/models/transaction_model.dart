class TransactionModel {
  final String id;
  final String taskId;
  final String requesterId;
  final String runnerId;
  final String amount;
  final String status;
  final String type;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? paymentMethod;
  final String? transactionReference;
  final String? notes;

  TransactionModel({
    required this.id,
    required this.taskId,
    required this.requesterId,
    required this.runnerId,
    required this.amount,
    required this.status,
    required this.type,
    required this.createdAt,
    this.completedAt,
    this.paymentMethod,
    this.transactionReference,
    this.notes,
  });

  factory TransactionModel.fromMap(Map<String, dynamic> map, String docId) {
    return TransactionModel(
      id: docId,
      taskId: map['taskId'] ?? '',
      requesterId: map['requesterId'] ?? '',
      runnerId: map['runnerId'] ?? '',
      amount: map['amount'] ?? '0',
      status: map['status'] ?? 'PENDING',
      type: map['type'] ?? 'TASK_PAYMENT',
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['createdAt'] ?? 0),
      completedAt: map['completedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['completedAt'])
          : null,
      paymentMethod: map['paymentMethod'],
      transactionReference: map['transactionReference'],
      notes: map['notes'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'taskId': taskId,
      'requesterId': requesterId,
      'runnerId': runnerId,
      'amount': amount,
      'status': status,
      'type': type,
      'createdAt': createdAt.millisecondsSinceEpoch,
      if (completedAt != null)
        'completedAt': completedAt!.millisecondsSinceEpoch,
      if (paymentMethod != null) 'paymentMethod': paymentMethod,
      if (transactionReference != null)
        'transactionReference': transactionReference,
      if (notes != null) 'notes': notes,
    };
  }

  TransactionModel copyWith({
    String? id,
    String? taskId,
    String? requesterId,
    String? runnerId,
    String? amount,
    String? status,
    String? type,
    DateTime? createdAt,
    DateTime? completedAt,
    String? paymentMethod,
    String? transactionReference,
    String? notes,
  }) {
    return TransactionModel(
      id: id ?? this.id,
      taskId: taskId ?? this.taskId,
      requesterId: requesterId ?? this.requesterId,
      runnerId: runnerId ?? this.runnerId,
      amount: amount ?? this.amount,
      status: status ?? this.status,
      type: type ?? this.type,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      transactionReference: transactionReference ?? this.transactionReference,
      notes: notes ?? this.notes,
    );
  }
}
