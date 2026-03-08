import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class RunnerPerformanceScreen extends StatelessWidget {
  const RunnerPerformanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Performance Insights"),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('tasks').snapshots(),
        builder: (context, snapshot) {

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return const Center(
              child: Text("No performance data available"),
            );
          }

          final tasks = snapshot.data!.docs;

          int completedTasks = tasks
              .where((task) => task['status'] == 'COMPLETED')
              .length;

          double totalEarnings = tasks.fold(0, (sum, task) {
            return sum + (task['price'] ?? 0);
          }).toDouble();

          int totalTasks = tasks.length;

          double avgDeliveryTime = totalTasks > 0 ? 18.5 : 0; 
          // placeholder average

          return Padding(
            padding: const EdgeInsets.all(16),
            child: GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [

                _buildStatCard(
                  "Completed Tasks",
                  completedTasks.toString(),
                  Icons.check_circle,
                  Colors.green,
                ),

                _buildStatCard(
                  "Total Earnings",
                  "₹${totalEarnings.toStringAsFixed(0)}",
                  Icons.currency_rupee,
                  Colors.blue,
                ),

                _buildStatCard(
                  "Total Tasks",
                  totalTasks.toString(),
                  Icons.assignment,
                  Colors.orange,
                ),

                _buildStatCard(
                  "Avg Delivery",
                  "${avgDeliveryTime.toStringAsFixed(1)} min",
                  Icons.timer,
                  Colors.purple,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatCard(
      String title,
      String value,
      IconData icon,
      Color color,
      ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            blurRadius: 10,
            color: Colors.black.withOpacity(0.05),
          )
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [

          Icon(icon, size: 40, color: color),

          const SizedBox(height: 10),

          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 6),

          Text(
            title,
            style: const TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}