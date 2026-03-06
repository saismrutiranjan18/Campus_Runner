import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:url_launcher/url_launcher.dart'; // REQUIRED FOR PDF VIEWER

// Project Imports
import '../../../core/config/app_mode.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/task_provider.dart';
import '../../../logic/campus_provider.dart';
import '../../../logic/location_provider.dart';
import '../../../logic/user_provider.dart';
import '../../../core/themes/theme_provider.dart';
import '../../../core/utils/formatters.dart';
import '../auth/login_screen.dart';
import '../../widgets/cards/task_card.dart';
import 'campuses_screen.dart';
import 'register_shop_screen.dart';
import 'requester_home_screen.dart';
import 'smart_route_screen.dart';
import '../profile/profile_screen.dart';

// Use ConsumerStatefulWidget to listen to Riverpod Providers
class RunnerHomeScreen extends ConsumerStatefulWidget {
  const RunnerHomeScreen({super.key});

  @override
  ConsumerState<RunnerHomeScreen> createState() => _RunnerHomeScreenState();
}

class _RunnerHomeScreenState extends ConsumerState<RunnerHomeScreen> {
  bool _isLoggedIn() {
    if (!AppMode.backendEnabled) return true;
    return ref.read(authRepositoryProvider).getCurrentUser() != null;
  }

  Future<bool> _requireLogin(String message) async {
    if (_isLoggedIn()) return true;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );

    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );

    return result == true;
  }

  // Helper to open the document URL
  Future<void> _launchDocument(String url, BuildContext context) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      // Use externalApplication mode to open the PDF in the device's native viewer
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Could not open document."),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // WATCH THE STREAM: This line connects UI to Firebase and updates in real-time
    final tasksAsync = ref.watch(tasksStreamProvider);
    final campusesAsync = ref.watch(campusesStreamProvider);
    final selectedCampusId = ref.watch(selectedCampusProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isDarkMode = themeMode == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Available Tasks"),
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SmartRouteScreen(),
                ),
              );
            },
            icon: const Icon(Icons.alt_route),
          ),
          IconButton(
            onPressed: () {
              ref.read(themeModeProvider.notifier).toggleTheme();
            },
            tooltip: isDarkMode
                ? 'Switch to light mode'
                : 'Switch to dark mode',
            icon: Icon(isDarkMode ? PhosphorIcons.sun() : PhosphorIcons.moon()),
          ),
          IconButton(onPressed: () {}, icon: Icon(PhosphorIcons.funnel())),
          IconButton(onPressed: () {}, icon: Icon(PhosphorIcons.bell())),
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
            icon: Icon(PhosphorIcons.userCircle()),
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'register_shop') {
                final canContinue = await _requireLogin(
                  'Please sign in to register a shop.',
                );
                if (!canContinue || !context.mounted) return;

                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const RegisterShopScreen(),
                  ),
                );
              } else if (value == 'campuses') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const CampusesScreen(),
                  ),
                );
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'register_shop',
                child: Text('Register Shop'),
              ),
              const PopupMenuItem(value: 'campuses', child: Text('Campuses')),
            ],
          ),
        ],
      ),

      // Floating Button to Post a New Task (for testing/requester flow)
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final canContinue = await _requireLogin(
            'Please sign in to post a task.',
          );
          if (!canContinue || !context.mounted) return;

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
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: campusesAsync.when(
              data: (campuses) {
                final campusItems = [
                  const DropdownMenuItem(
                    value: 'all',
                    child: Text('All campuses'),
                  ),
                  ...campuses.map(
                    (campus) => DropdownMenuItem(
                      value: campus.id,
                      child: Text(campus.name),
                    ),
                  ),
                ];

                return DropdownButtonFormField<String>(
                  initialValue: selectedCampusId ?? 'all',
                  decoration: const InputDecoration(
                    labelText: 'Filter by campus',
                    border: OutlineInputBorder(),
                  ),
                  items: campusItems,
                  onChanged: (value) {
                    ref.read(selectedCampusProvider.notifier).state =
                        value ?? 'all';
                  },
                );
              },
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text('Error: $error'),
            ),
          ),
          Expanded(
            child: tasksAsync.when(
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
                      transportMode: "Walking",
                    );
                  },
                ),
              ),

              // B. ERROR STATE
              error: (err, stack) =>
                  Center(child: Text("Error loading tasks: ${err.toString()}")),

              // C. DATA STATE
              data: (tasks) {
                if (tasks.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          PhosphorIcons.smileySad(),
                          size: 64,
                          color: Colors.grey,
                        ),
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
                          transportMode: task.transportMode,
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
                                    onPressed: () =>
                                        _launchDocument(task.fileUrl!, context),
                                    icon: Icon(PhosphorIcons.filePdf()),
                                    label: const Text("View Document"),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Theme.of(
                                        context,
                                      ).colorScheme.primary,
                                      side: BorderSide(
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.primary,
                                      ),
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
                                      final canContinue = await _requireLogin(
                                        'Please sign in to accept tasks.',
                                      );
                                      if (!canContinue || !context.mounted) {
                                        return;
                                      }

                                      try {
                                        final currentUser = ref
                                            .read(authRepositoryProvider)
                                            .getCurrentUser();
                                        if (currentUser == null) {
                                          throw Exception(
                                            'User not authenticated',
                                          );
                                        }

                                        final userProfile = await ref
                                            .read(userRepositoryProvider)
                                            .getUserProfile(currentUser.uid);
                                        if (userProfile == null) {
                                          throw Exception(
                                            'User profile not found',
                                          );
                                        }

                                        final locationService = ref.read(
                                          locationServiceProvider,
                                        );
                                        final hasPermission =
                                            await locationService
                                                .requestLocationPermission();

                                        if (!hasPermission) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(
                                              context,
                                            ).showSnackBar(
                                              const SnackBar(
                                                content: Text(
                                                  'Location permission required for tracking',
                                                ),
                                                backgroundColor: Colors.red,
                                              ),
                                            );
                                          }
                                          return;
                                        }

                                        await ref
                                            .read(taskRepositoryProvider)
                                            .acceptTask(
                                              taskId: task.id,
                                              runnerId: currentUser.uid,
                                              runnerName:
                                                  userProfile.displayName,
                                              runnerPhone:
                                                  userProfile.phoneNumber,
                                            );

                                        locationService.startLocationTracking(
                                          task.id,
                                        );

                                        if (context.mounted) {
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                "Task Accepted! Location tracking started.",
                                              ),
                                              backgroundColor: Colors.black,
                                            ),
                                          );
                                        }
                                      } catch (e) {
                                        if (mounted) {
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                "Error accepting task: $e",
                                              ),
                                              backgroundColor: Colors.red,
                                            ),
                                          );
                                        }
                                      }
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.black87,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    icon: const Icon(
                                      Icons.check_circle,
                                      size: 18,
                                    ),
                                    label: const Text("Accept"),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ).animate().fade(duration: 300.ms).slideY(begin: 0.1, end: 0);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
