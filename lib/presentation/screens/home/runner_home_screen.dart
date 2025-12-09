import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:url_launcher/url_launcher.dart'; // REQUIRED FOR PDF VIEWER

// Project Imports
import '../../../logic/task_provider.dart';
import '../../../data/models/task_model.dart';
import '../../../core/utils/formatters.dart';
import '../../widgets/cards/task_card.dart';
import 'requester_home_screen.dart';

// Use ConsumerStatefulWidget to listen to Riverpod Providers
class RunnerHomeScreen extends ConsumerStatefulWidget {
  const RunnerHomeScreen({super.key});

  @override
  ConsumerState<RunnerHomeScreen> createState() => _RunnerHomeScreenState();
}

class _RunnerHomeScreenState extends ConsumerState<RunnerHomeScreen> {
  // Helper to open the document URL
  Future<void> _launchDocument(String url, BuildContext context) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      // Use externalApplication mode to open the PDF in the device's native viewer
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Could not open document."), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // WATCH THE STREAM: This line connects UI to Firebase and updates in real-time
    final tasksAsync = ref.watch(tasksStreamProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Available Tasks"),
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: () {}, 
            icon: Icon(PhosphorIcons.funnel()),
          ),
          IconButton(
            onPressed: () {}, 
            icon: Icon(PhosphorIcons.bell()),
          ),
        ],
      ),

      // Floating Button to Post a New Task (for testing/requester flow)
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const RequesterHomeScreen(),
            ),
          );
        },
        icon: Icon(PhosphorIcons.plus()),
        label: const Text("Post Task"),
      ),

      // THE BODY: Handles Loading, Error, and Data states from the Stream
      body: tasksAsync.when(
        // A. LOADING STATE
        loading: () => Skeletonizer(
          enabled: true,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 6,
            itemBuilder: (context, index) {
              return const TaskCard(
                title: "Loading Task Title...",
                pickup: "Loading Location...",
                drop: "Loading Drop...",
                price: "...",
                time: "...",
              );
            },
          ),
        ),

        // B. ERROR STATE
        error: (err, stack) => Center(
          child: Text("Error loading tasks: ${err.toString()}"),
        ),

        // C. DATA STATE
        data: (tasks) {
          if (tasks.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(PhosphorIcons.smileySad(), size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text(
                    "No tasks available right now.",
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ],
              ),
            );
          }

          // Show the list of tasks
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              
              // We use a Column to stack the card and the action button
              return Column(
                children: [
                  // 1. The Task Card Display
                  TaskCard(
                    title: task.title,
                    pickup: task.pickup,
                    drop: task.drop,
                    price: "₹${task.price}",
                    time: AppFormatters.formatTimeAgo(task.createdAt),
                  ),
                  
                  // 2. Action Buttons (New Row for File View and Acceptance)
                  Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    child: Row(
                      children: [
                        // --- VIEW DOCUMENT BUTTON (Only shows if fileUrl exists) ---
                        if (task.fileUrl != null)
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _launchDocument(task.fileUrl!, context),
                              icon:  Icon(PhosphorIcons.filePdf()),
                              label: const Text("View Document"),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Theme.of(context).colorScheme.primary,
                                side: BorderSide(color: Theme.of(context).colorScheme.primary),
                              ),
                            ),
                          ),

                        // Add space between buttons if both are present
                        if (task.fileUrl != null && task.status == 'OPEN')
                          const SizedBox(width: 8),

                        // --- ACCEPT BUTTON (Only shows if status is OPEN) ---
                        if (task.status == 'OPEN')
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                // Call the Repository to update status to IN_PROGRESS
                                try {
                                  await ref.read(taskRepositoryProvider).updateTaskStatus(task.id, 'IN_PROGRESS');
                                  
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Task Accepted! Go get it!"),
                                        backgroundColor: Colors.black,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text("Error accepting task: $e"), backgroundColor: Colors.red),
                                  );
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.black87,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              icon: const Icon(Icons.check_circle, size: 18),
                              label: const Text("Accept"),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              )
              .animate()
              .fade(duration: 300.ms)
              .slideY(begin: 0.1, end: 0); 
            },
          );
        },
      ),
    );
  }
}