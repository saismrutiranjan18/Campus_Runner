import 'package:flutter/material.dart';

class TaskHistoryScreen extends StatelessWidget {
  const TaskHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text("Task History"),
          bottom: const TabBar(
            tabs: [
              Tab(text: "Active"),
              Tab(text: "Completed"),
              Tab(text: "Cancelled"),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            TaskList(status: "active"),
            TaskList(status: "completed"),
            TaskList(status: "cancelled"),
          ],
        ),
      ),
    );
  }
}

class TaskList extends StatelessWidget {
  final String status;

  const TaskList({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final tasks = [
      {"title": "Deliver Food", "location": "Block A", "status": status},
      {"title": "Pickup Groceries", "location": "Market", "status": status},
    ];

    return ListView.builder(
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];

        return Card(
          margin: const EdgeInsets.all(10),
          child: ListTile(
            title: Text(task["title"]!),
            subtitle: Text(task["location"]!),
            trailing: Text(
              status.toUpperCase(),
              style: TextStyle(
                color: status == "completed"
                    ? Colors.green
                    : status == "cancelled"
                        ? Colors.red
                        : Colors.orange,
              ),
            ),
          ),
        );
      },
    );
  }
}