import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/transaction_provider.dart';
import '../../../core/utils/formatters.dart';

class RunnerEarningsScreen extends ConsumerWidget {
  const RunnerEarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(authRepositoryProvider).getCurrentUser();

    if (currentUser == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Earnings')),
        body: const Center(child: Text('Please sign in to view earnings')),
      );
    }

    final transactionsAsync = ref.watch(
      runnerTransactionsProvider(currentUser.uid),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Earnings'),
        centerTitle: false,
      ),
      body: transactionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
        data: (transactions) {
          if (transactions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    PhosphorIcons.wallet(),
                    size: 64,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No transactions yet',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ],
              ),
            );
          }

          final completedTransactions = transactions
              .where((t) => t.status == 'COMPLETED')
              .toList();
          final totalEarnings = completedTransactions.fold<double>(
            0,
            (sum, t) => sum + (double.tryParse(t.amount) ?? 0),
          );

          return Column(
            children: [
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade700, Colors.blue.shade900],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    const Text(
                      'Total Earnings',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '₹${totalEarnings.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${completedTransactions.length} completed tasks',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: transactions.length,
                  itemBuilder: (context, index) {
                    final transaction = transactions[index];
                    final isCompleted = transaction.status == 'COMPLETED';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isCompleted
                              ? Colors.green.shade100
                              : Colors.orange.shade100,
                          child: Icon(
                            isCompleted
                                ? PhosphorIcons.checkCircle()
                                : PhosphorIcons.clock(),
                            color: isCompleted ? Colors.green : Colors.orange,
                          ),
                        ),
                        title: Text(
                          '₹${transaction.amount}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Task ID: ${transaction.taskId}'),
                            Text(
                              AppFormatters.formatTimeAgo(
                                transaction.createdAt,
                              ),
                            ),
                          ],
                        ),
                        trailing: Chip(
                          label: Text(transaction.status),
                          backgroundColor: isCompleted
                              ? Colors.green.shade100
                              : Colors.orange.shade100,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
