import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/services/transaction_service.dart';
import '../data/models/transaction_model.dart';

final transactionServiceProvider = Provider((ref) => TransactionService());

final runnerTransactionsProvider = StreamProvider.family<List<TransactionModel>, String>((ref, runnerId) {
  return ref.watch(transactionServiceProvider).getTransactionsByUser(runnerId);
});

final taskTransactionsProvider = StreamProvider.family<List<TransactionModel>, String>((ref, taskId) {
  return ref.watch(transactionServiceProvider).getTransactionsByTask(taskId);
});
