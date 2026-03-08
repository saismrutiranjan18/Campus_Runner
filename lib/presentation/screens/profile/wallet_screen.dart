import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../logic/user_provider.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  bool _initialized = false;
  bool _isSubmitting = false;
  double _balance = 0;
  List<_WalletTransaction> _transactions = const [];
  DateTime _lastUpdated = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final userProfileAsync = ref.watch(currentUserProfileProvider);

    return userProfileAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Wallet')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        appBar: AppBar(title: const Text('Wallet')),
        body: _WalletErrorState(message: 'Failed to load wallet: $error'),
      ),
      data: (userProfile) {
        if (!_initialized) {
          _seedWalletData(userProfile);
        }

        return Scaffold(
          appBar: AppBar(title: const Text('Wallet')),
          body: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        colors.primaryContainer.withValues(alpha: 0.4),
                        colors.tertiaryContainer.withValues(alpha: 0.26),
                        colors.surface,
                      ],
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: RefreshIndicator(
                  onRefresh: () async {
                    await Future<void>.delayed(
                      const Duration(milliseconds: 600),
                    );
                    if (!mounted) return;
                    setState(() {
                      _lastUpdated = DateTime.now();
                    });
                  },
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      _WalletBalanceCard(
                            balance: _balance,
                            lastUpdated: _lastUpdated,
                            onAddMoney: _isSubmitting
                                ? null
                                : () => _openActionSheet(_WalletAction.add),
                            onWithdraw: _isSubmitting
                                ? null
                                : () =>
                                      _openActionSheet(_WalletAction.withdraw),
                          )
                          .animate()
                          .fade(duration: 280.ms)
                          .slideY(begin: 0.08, end: 0),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Text(
                            'Recent Activity',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${_transactions.length} entries',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_transactions.isEmpty)
                        const _WalletEmptyState()
                      else
                        ...List.generate(_transactions.length, (index) {
                          final transaction = _transactions[index];
                          return Padding(
                            padding: EdgeInsets.only(
                              bottom: index == _transactions.length - 1
                                  ? 0
                                  : 12,
                            ),
                            child:
                                _WalletTransactionTile(transaction: transaction)
                                    .animate(delay: (index * 45).ms)
                                    .fade(duration: 260.ms)
                                    .slideX(begin: 0.04, end: 0),
                          );
                        }),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _seedWalletData(dynamic userProfile) {
    final totalEarnings = (userProfile?.totalEarnings as double?) ?? 0.0;
    final completedTasks = (userProfile?.completedTasks as int?) ?? 0;
    final seededBalance = totalEarnings > 0 ? totalEarnings : 320.0;

    _balance = seededBalance;
    _transactions = [
      if (completedTasks > 0)
        _WalletTransaction(
          id: 'earned_${completedTasks}_1',
          title: 'Task payout batch',
          subtitle: 'Completed $completedTasks campus errands',
          amount: math.max(120, totalEarnings * 0.35),
          timestamp: DateTime.now().subtract(const Duration(hours: 6)),
          type: _WalletTransactionType.credit,
          status: _WalletTransactionStatus.completed,
        ),
      _WalletTransaction(
        id: 'withdrawal_hold',
        title: 'Withdrawal review',
        subtitle: 'Transfer to bank account pending review',
        amount: 150,
        timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
        type: _WalletTransactionType.debit,
        status: _WalletTransactionStatus.pending,
      ),
      _WalletTransaction(
        id: 'welcome_bonus',
        title: 'Runner welcome bonus',
        subtitle: 'Intro credit added to your wallet',
        amount: 80,
        timestamp: DateTime.now().subtract(const Duration(days: 2, hours: 5)),
        type: _WalletTransactionType.credit,
        status: _WalletTransactionStatus.completed,
      ),
    ];
    _lastUpdated = DateTime.now();
    _initialized = true;
  }

  Future<void> _openActionSheet(_WalletAction action) async {
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    final isAdd = action == _WalletAction.add;

    final result = await showModalBottomSheet<_WalletActionPayload>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final colors = Theme.of(context).colorScheme;

        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            top: 16,
          ),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAdd ? 'Add money' : 'Withdraw funds',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  isAdd
                      ? 'Placeholder flow for wallet top-ups. Amount is stored only in this local session.'
                      : 'Placeholder flow for withdrawals. This does not reach any payment backend yet.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: amountController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(
                    labelText: 'Amount',
                    prefixText: '₹ ',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: noteController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: isAdd ? 'Source note' : 'Withdrawal note',
                    hintText: isAdd
                        ? 'Example: Added via UPI placeholder'
                        : 'Example: Weekly payout request',
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          final amount = double.tryParse(
                            amountController.text.trim(),
                          );
                          if (amount == null || amount <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Enter a valid amount'),
                              ),
                            );
                            return;
                          }

                          Navigator.pop(
                            context,
                            _WalletActionPayload(
                              amount: amount,
                              note: noteController.text.trim(),
                            ),
                          );
                        },
                        child: Text(isAdd ? 'Add' : 'Withdraw'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    amountController.dispose();
    noteController.dispose();

    if (result == null || !mounted) return;

    if (!isAdd && result.amount > _balance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Insufficient wallet balance for this placeholder withdrawal',
          ),
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    await Future<void>.delayed(const Duration(milliseconds: 450));

    if (!mounted) return;

    final amount = result.amount;
    final note = result.note.isEmpty
        ? (isAdd
              ? 'Manual top-up placeholder'
              : 'Manual withdrawal placeholder')
        : result.note;

    setState(() {
      _balance = isAdd ? _balance + amount : _balance - amount;
      _lastUpdated = DateTime.now();
      _transactions = [
        _WalletTransaction(
          id: DateTime.now().microsecondsSinceEpoch.toString(),
          title: isAdd ? 'Wallet top-up' : 'Withdrawal request',
          subtitle: note,
          amount: amount,
          timestamp: DateTime.now(),
          type: isAdd
              ? _WalletTransactionType.credit
              : _WalletTransactionType.debit,
          status: _WalletTransactionStatus.pending,
        ),
        ..._transactions,
      ];
      _isSubmitting = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isAdd
              ? 'Top-up added locally. Payment gateway integration is still pending.'
              : 'Withdrawal request created locally. Backend settlement is still pending.',
        ),
      ),
    );
  }
}

class _WalletBalanceCard extends StatelessWidget {
  const _WalletBalanceCard({
    required this.balance,
    required this.lastUpdated,
    required this.onAddMoney,
    required this.onWithdraw,
  });

  final double balance;
  final DateTime lastUpdated;
  final VoidCallback? onAddMoney;
  final VoidCallback? onWithdraw;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, colors.secondary, colors.tertiary],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Available Balance',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colors.onPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: colors.onPrimary.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      PhosphorIcons.wallet(),
                      size: 14,
                      color: colors.onPrimary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Campus Wallet',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colors.onPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            '₹${balance.toStringAsFixed(0)}',
            style: theme.textTheme.headlineMedium?.copyWith(
              color: colors.onPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Last updated ${_formatTimestamp(lastUpdated)}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onPrimary.withValues(alpha: 0.84),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: onAddMoney,
                  style: FilledButton.styleFrom(
                    backgroundColor: colors.onPrimary,
                    foregroundColor: colors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: Icon(PhosphorIcons.arrowDown()),
                  label: const Text('Add Money'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onWithdraw,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: colors.onPrimary,
                    side: BorderSide(
                      color: colors.onPrimary.withValues(alpha: 0.45),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: Icon(PhosphorIcons.arrowUp()),
                  label: const Text('Withdraw'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WalletTransactionTile extends StatelessWidget {
  const _WalletTransactionTile({required this.transaction});

  final _WalletTransaction transaction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final isCredit = transaction.type == _WalletTransactionType.credit;
    final accent = isCredit ? colors.primary : colors.error;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: colors.surface.withValues(alpha: 0.78),
        border: Border.all(
          color: colors.outlineVariant.withValues(alpha: 0.28),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: accent.withValues(alpha: 0.14),
            ),
            child: Icon(
              isCredit ? PhosphorIcons.arrowDown() : PhosphorIcons.arrowUp(),
              color: accent,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  transaction.subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _formatTimestamp(transaction.timestamp),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isCredit ? '+' : '-'}₹${transaction.amount.toStringAsFixed(0)}',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  color: _statusColor(
                    colors,
                    transaction.status,
                  ).withValues(alpha: 0.14),
                ),
                child: Text(
                  transaction.status.label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: _statusColor(colors, transaction.status),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _statusColor(ColorScheme colors, _WalletTransactionStatus status) {
    switch (status) {
      case _WalletTransactionStatus.completed:
        return colors.primary;
      case _WalletTransactionStatus.pending:
        return colors.tertiary;
      case _WalletTransactionStatus.failed:
        return colors.error;
    }
  }
}

class _WalletEmptyState extends StatelessWidget {
  const _WalletEmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: colors.surface.withValues(alpha: 0.76),
        border: Border.all(color: colors.outlineVariant.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: colors.primaryContainer.withValues(alpha: 0.6),
            ),
            child: Icon(PhosphorIcons.receipt(), color: colors.primary),
          ),
          const SizedBox(height: 12),
          Text(
            'No wallet activity yet',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Add money or complete a few tasks and your transaction history will appear here.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _WalletErrorState extends StatelessWidget {
  const _WalletErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(PhosphorIcons.warningCircle(), size: 42, color: colors.error),
            const SizedBox(height: 12),
            Text(
              'Wallet unavailable',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WalletTransaction {
  const _WalletTransaction({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.timestamp,
    required this.type,
    required this.status,
  });

  final String id;
  final String title;
  final String subtitle;
  final double amount;
  final DateTime timestamp;
  final _WalletTransactionType type;
  final _WalletTransactionStatus status;
}

class _WalletActionPayload {
  const _WalletActionPayload({required this.amount, required this.note});

  final double amount;
  final String note;
}

enum _WalletAction { add, withdraw }

enum _WalletTransactionType { credit, debit }

enum _WalletTransactionStatus {
  completed('Completed'),
  pending('Pending'),
  failed('Failed');

  const _WalletTransactionStatus(this.label);

  final String label;
}

String _formatTimestamp(DateTime timestamp) {
  final now = DateTime.now();
  final diff = now.difference(timestamp);

  if (diff.inMinutes < 1) {
    return 'just now';
  }
  if (diff.inHours < 1) {
    return '${diff.inMinutes} min ago';
  }
  if (diff.inDays < 1) {
    return '${diff.inHours} hr ago';
  }
  if (diff.inDays < 7) {
    return '${diff.inDays} day${diff.inDays == 1 ? '' : 's'} ago';
  }
  return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
}
