import 'package:flutter/material.dart';

class TaskTimelineWidget extends StatelessWidget {
  final String status;

  const TaskTimelineWidget({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final stages = [
      "created",
      "accepted",
      "picked_up",
      "delivered",
      "completed"
    ];

    int currentIndex = stages.indexOf(status);

    return Column(
      children: List.generate(stages.length, (index) {
        bool completed = index <= currentIndex;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Icon(
                  Icons.circle,
                  size: 16,
                  color: completed ? Colors.green : Colors.grey,
                ),
                if (index != stages.length - 1)
                  Container(
                    width: 2,
                    height: 40,
                    color: completed ? Colors.green : Colors.grey,
                  ),
              ],
            ),
            const SizedBox(width: 10),
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Text(
                stages[index].replaceAll("_", " ").toUpperCase(),
                style: TextStyle(
                  fontWeight: completed ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            )
          ],
        );
      }),
    );
  }
}