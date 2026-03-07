import 'package:flutter/material.dart';

class EarningsDashboardCard extends StatelessWidget {
  final double weeklyEarnings;
  final double monthlyEarnings;
  final int completedTasks;
  final double avgPerTask;

  const EarningsDashboardCard({
    super.key,
    required this.weeklyEarnings,
    required this.monthlyEarnings,
    required this.completedTasks,
    required this.avgPerTask,
  });

  Widget _buildCard(String title, String value, IconData icon) {
    return Expanded(
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Icon(icon, size: 28, color: Colors.blue),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            _buildCard("This Week", "₹$weeklyEarnings", Icons.calendar_today),
            const SizedBox(width: 8),
            _buildCard("This Month", "₹$monthlyEarnings", Icons.date_range),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _buildCard("Completed", "$completedTasks", Icons.check_circle),
            const SizedBox(width: 8),
            _buildCard("Avg / Task", "₹$avgPerTask", Icons.bar_chart),
          ],
        ),
      ],
    );
  }
}