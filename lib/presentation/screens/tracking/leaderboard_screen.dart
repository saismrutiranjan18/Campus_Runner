import 'package:flutter/material.dart';

class LeaderboardScreen extends StatelessWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> runners = [
      {"name": "Alex", "distance": 12.5},
      {"name": "Sam", "distance": 10.2},
      {"name": "John", "distance": 9.8},
      {"name": "Emma", "distance": 8.6},
    ];

    runners.sort((a, b) => b["distance"].compareTo(a["distance"]));

    return Scaffold(
      appBar: AppBar(
        title: const Text("Leaderboard"),
      ),
      body: ListView.builder(
        itemCount: runners.length,
        itemBuilder: (context, index) {
          final runner = runners[index];

          return ListTile(
            leading: CircleAvatar(
              child: Text("${index + 1}"),
            ),
            title: Text(runner["name"]),
            trailing: Text("${runner["distance"]} km"),
          );
        },
      ),
    );
  }
}