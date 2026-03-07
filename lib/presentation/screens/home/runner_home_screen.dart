import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_mode.dart';
import '../../../core/utils/formatters.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/campus_provider.dart';
import '../../../logic/task_provider.dart';
import '../../../logic/location_provider.dart';
import '../../../logic/user_provider.dart';
import '../../../core/themes/theme_provider.dart';
import '../../../core/utils/formatters.dart';
import '../auth/login_screen.dart';
import '../../widgets/cards/task_card.dart';
import '../../widgets/loaders/aurora_loader.dart';
import 'campuses_screen.dart';
import 'register_shop_screen.dart';
import 'requester_home_screen.dart';
import 'smart_route_screen.dart';
import '../profile/profile_screen.dart';
import '../tracking/leaderboard_screen.dart';

class RunnerHomeScreen extends ConsumerStatefulWidget {
  const RunnerHomeScreen({super.key});

  @override
  ConsumerState<RunnerHomeScreen> createState() => _RunnerHomeScreenState();
}

class _RunnerHomeScreenState extends ConsumerState<RunnerHomeScreen> {
  String sortType = "latest";
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

  Future<void> _launchDocument(String url, BuildContext context) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not open document.'),
          backgroundColor: Colors.red,
        ),
      );
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

  IconData _transportIcon(String transportMode) {
    final normalized = transportMode.trim().toLowerCase();
    if (normalized.contains('cycle') || normalized.contains('bike')) {
      return PhosphorIcons.bicycle();
    }
    if (normalized.contains('car') || normalized.contains('auto')) {
      return PhosphorIcons.car();
    }
    return PhosphorIcons.personSimpleWalk();
  }

  Color _transportAccent(ColorScheme colors, String transportMode) {
    final normalized = transportMode.trim().toLowerCase();
    if (normalized.contains('cycle') || normalized.contains('bike')) {
      return colors.tertiary;
    }
    if (normalized.contains('car') || normalized.contains('auto')) {
      return colors.secondary;
    }
    return colors.primary;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final tasksAsync = ref.watch(tasksStreamProvider);
    final locationService = ref.read(locationServiceProvider);
    final runnerLocation = locationService.currentLocation;
    final campusesAsync = ref.watch(campusesStreamProvider);
    final selectedCampusId = ref.watch(selectedCampusProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isDarkMode = themeMode == ThemeMode.dark;

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: const Text('Available Tasks'),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SmartRouteScreen()),
              );
            },
            icon: const Icon(Icons.alt_route),
            tooltip: 'Smart route',
          ),
          IconButton(
            onPressed: () {},
            icon: Icon(PhosphorIcons.funnel()),
            tooltip: 'Filters',
          ),
          IconButton(
            onPressed: () {},
            icon: Icon(PhosphorIcons.bell()),
            tooltip: 'Notifications',
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
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const LeaderboardScreen(),
              ),
            );
          },
          icon: const Icon(Icons.leaderboard),
        ),
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
                  MaterialPageRoute(builder: (_) => const RegisterShopScreen()),
                );
              } else if (value == 'campuses') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CampusesScreen()),
                );
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: 'register_shop',
                child: Text('Register Shop'),
              ),
              PopupMenuItem(value: 'campuses', child: Text('Campuses')),
            ],
          ),
        ],
      ),
      floatingActionButton:
          FloatingActionButton.extended(
                onPressed: () async {
                  final canContinue = await _requireLogin(
                    'Please sign in to post a task.',
                  );
                  if (!canContinue || !context.mounted) return;

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const RequesterHomeScreen(),
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
        if (runnerLocation != null)
        FutureBuilder(
          future: _smartTaskService.getRecommendedTasks(runnerLocation),
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const SizedBox();

            final recommendedTasks = snapshot.data!;

            if (recommendedTasks.isEmpty) return const SizedBox();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    "Recommended Tasks",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),

                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: recommendedTasks.length,
                  itemBuilder: (context, index) {
                    final task = recommendedTasks[index].data();

                    return TaskCard(
                      title: task['title'],
                      pickup: task['pickup'],
                      drop: task['drop'],
                      price: "₹${task['price']}",
                      time: "Recommended",
                      transportMode: task['transportMode'],
                    );
                  },
                ),
              ],
            );
          },
        ),
        children: [
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TaskHistoryScreen(),
                ),
              );
            },
            child: const Text("View Task History"),
          ),
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
                  );
                },
                icon: Icon(PhosphorIcons.plus()),
                label: const Text('Post Task'),
              )
              .animate()
              .scale(duration: 450.ms, curve: Curves.easeOutBack)
              .fadeIn(duration: 250.ms),
      body: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    colors.primaryContainer.withOpacity(0.32),
                    colors.secondaryContainer.withOpacity(0.24),
                    colors.tertiaryContainer.withOpacity(0.22),
                    colors.surface,
                  ],
                ),
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
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: AuroraLoader(
                  size: 42,
                  strokeWidth: 6,
                  label: 'Loading campuses',
                ),
              ),
              error: (error, _) => Text('Error: $error'),
            ),
          ),
          Positioned(
            top: -70,
            left: -50,
            child:
                Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: colors.primary.withOpacity(0.12),
                      ),
                    )
                    .animate(
                      onPlay: (controller) => controller.repeat(reverse: true),
                    )
                    .scaleXY(begin: 0.95, end: 1.05, duration: 3.seconds),
          ),
          Positioned(
            right: -70,
            top: 140,
            child:
                Container(
                      width: 230,
                      height: 230,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: colors.tertiary.withOpacity(0.1),
                      ),
                    )
                    .animate(
                      onPlay: (controller) => controller.repeat(reverse: true),
                    )
                    .moveY(
                      begin: -8,
                      end: 8,
                      duration: 4.seconds,
                      curve: Curves.easeInOut,
                    ),
          ),
          Column(
            children: [
              Container(
                margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  color: colors.surface.withOpacity(0.42),
                  border: Border.all(
                    color: colors.outlineVariant.withOpacity(0.4),
                  ),
          // FILTER + SORT BUTTONS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Text('Sort by: '),
                DropdownButton<String>(
                  value: sortType,
                  items: const [
                    DropdownMenuItem(value: 'latest', child: Text('Latest created')),
                    DropdownMenuItem(value: 'highest_price', child: Text('Highest price')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        sortType = value;
                      });
                    }
                  },
                ),
              ],
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
                child: campusesAsync.when(
                  data: (campuses) {
                    final campusItems = [
                      const DropdownMenuItem<String>(
                        value: 'all',
                        child: Text('All campuses'),
                      ),
                      ...campuses.map(
                        (campus) => DropdownMenuItem<String>(
                          value: campus.id,
                          child: Text(campus.name),
                        ),
                      ),
                    ];
              loading: () => const FullScreenAuroraLoader(
                label: 'Fetching tasks',
                subtitle: 'Finding the latest campus requests for you',
              ),

              // B. ERROR STATE
              error: (err, stack) =>
                  Center(child: Text("Error loading tasks: ${err.toString()}")),

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
              // C. DATA STATE
              data: (tasks) {
                final sortedTasks = [...tasks];
                if (sortType == "highest_price") {
                sortedTasks.sort((a, b) => b.price.compareTo(a.price));
              } else if (sortType == "latest") {
                sortedTasks.sort((a, b) => b.createdAt.compareTo(a.createdAt));
              }

             if (sortedTasks.isEmpty){
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            Icon(
                              PhosphorIcons.sparkle(),
                              color: colors.primary,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Smart Picks',
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: colors.onSurface,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: selectedCampusId ?? 'all',
                          borderRadius: BorderRadius.circular(16),
                          dropdownColor: colors.surfaceContainer,
                          decoration: InputDecoration(
                            labelText: 'Filter by campus',
                            prefixIcon: Icon(PhosphorIcons.mapPinLine()),
                            filled: true,
                            fillColor: colors.surfaceContainerHighest
                                .withOpacity(0.45),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(
                                color: colors.outlineVariant.withOpacity(0.35),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(
                                color: colors.outlineVariant.withOpacity(0.3),
                              ),
                            ),
                          ),
                          items: campusItems,
                          onChanged: (value) {
                            ref.read(selectedCampusProvider.notifier).state =
                                value ?? 'all';
                          },
                        ),
                      ],
                    );
                  },
                  loading: () => const LinearProgressIndicator(),
                  error: (error, _) => Text('Error: $error'),
                ),
              ).animate().fade(duration: 380.ms).slideY(begin: -0.18, end: 0),
              Expanded(
                child: tasksAsync.when(
                  loading: () => Skeletonizer(
                    enabled: true,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                      itemCount: 5,
                      itemBuilder: (_, __) => Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(28),
                          gradient: LinearGradient(
                            colors: [
                              colors.primaryContainer.withOpacity(0.4),
                              colors.secondaryContainer.withOpacity(0.35),
                            ],
                          ),
                    ),
                  );
                }

                // Show the list of tasks
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: sortedTasks.length,
                  itemBuilder: (context, index) {
                    final task = sortedTasks[index];

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
                        padding: const EdgeInsets.all(18),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Sample task title goes here'),
                            SizedBox(height: 10),
                            Text('Pickup location'),
                            SizedBox(height: 6),
                            Text('Drop location'),
                            SizedBox(height: 18),
                            Row(
                              children: [
                                Expanded(child: Text('View Document')),
                                SizedBox(width: 8),
                                Expanded(child: Text('Accept')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  error: (err, _) => Center(
                    child: Text('Error loading tasks: ${err.toString()}'),
                  ),
                  data: (tasks) {
                    if (tasks.isEmpty) {
                      return Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: colors.primaryContainer.withOpacity(
                                      0.5,
                                    ),
                                  ),
                                  child: Icon(
                                    PhosphorIcons.listChecks(),
                                    size: 38,
                                    color: colors.primary,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  'No tasks available right now.',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: colors.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          )
                          .animate()
                          .fade(duration: 350.ms)
                          .scaleXY(begin: 0.95, end: 1);
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                      itemCount: tasks.length,
                      itemBuilder: (context, index) {
                        final task = tasks[index];
                        final accent = _transportAccent(
                          colors,
                          task.transportMode,
                        );

                        return Container(
                              margin: const EdgeInsets.only(bottom: 18),
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(28),
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    accent.withOpacity(0.17),
                                    colors.surfaceContainer.withOpacity(0.64),
                                    colors.secondaryContainer.withOpacity(0.18),
                                  ],
                                ),
                                border: Border.all(
                                  color: accent.withOpacity(0.28),
                                  width: 1.2,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 58,
                                        height: 58,
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                          color: accent.withOpacity(0.2),
                                        ),
                                        child: Icon(
                                          _transportIcon(task.transportMode),
                                          color: accent,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              task.title,
                                              style: theme.textTheme.titleLarge
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              children: [
                                                Icon(
                                                  PhosphorIcons.storefront(),
                                                  size: 16,
                                                  color:
                                                      colors.onSurfaceVariant,
                                                ),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text(
                                                    task.pickup,
                                                    style: theme
                                                        .textTheme
                                                        .bodyLarge
                                                        ?.copyWith(
                                                          color: colors
                                                              .onSurfaceVariant,
                                                        ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 5),
                                            Row(
                                              children: [
                                                Icon(
                                                  PhosphorIcons.arrowDown(),
                                                  size: 16,
                                                  color: accent,
                                                ),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text(
                                                    task.drop,
                                                    style: theme
                                                        .textTheme
                                                        .bodyLarge
                                                        ?.copyWith(
                                                          color: accent,
                                                          fontWeight:
                                                              FontWeight.w600,
                                                        ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 8,
                                            ),
                                            decoration: BoxDecoration(
                                              color: colors.tertiaryContainer
                                                  .withOpacity(0.6),
                                              borderRadius:
                                                  BorderRadius.circular(999),
                                            ),
                                            child: Text(
                                              '₹${task.price}',
                                              style: theme.textTheme.titleMedium
                                                  ?.copyWith(
                                                    color: colors
                                                        .onTertiaryContainer,
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            AppFormatters.formatTimeAgo(
                                              task.createdAt,
                                            ),
                                            style: theme.textTheme.bodyMedium
                                                ?.copyWith(
                                                  color:
                                                      colors.onSurfaceVariant,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: colors.surfaceContainerHighest
                                              .withOpacity(0.55),
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              _transportIcon(
                                                task.transportMode,
                                              ),
                                              size: 14,
                                              color: accent,
                                            ),
                                            const SizedBox(width: 5),
                                            Text(task.transportMode),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: colors.primaryContainer
                                              .withOpacity(0.38),
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              PhosphorIcons.mapPin(),
                                              size: 14,
                                              color: colors.primary,
                                            ),
                                            const SizedBox(width: 5),
                                            Text(task.campusName),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 14),
                                  Row(
                                    children: [
                                      if (task.fileUrl != null)
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _launchDocument(
                                              task.fileUrl!,
                                              context,
                                            ),
                                            style: OutlinedButton.styleFrom(
                                              side: BorderSide(
                                                color: accent.withOpacity(0.45),
                                              ),
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(14),
                                              ),
                                            ),
                                            icon: Icon(PhosphorIcons.filePdf()),
                                            label: const Text('Document'),
                                          ),
                                        ),
                                      if (task.fileUrl != null &&
                                          task.status == 'OPEN')
                                        const SizedBox(width: 10),
                                      if (task.status == 'OPEN')
                                        Expanded(
                                          child: FilledButton.icon(
                                            onPressed: () async {
                                              final canContinue =
                                                  await _requireLogin(
                                                    'Please sign in to accept tasks.',
                                                  );
                                              if (!canContinue ||
                                                  !context.mounted) {
                                                return;
                                              }

                                              try {
                                                await ref
                                                    .read(
                                                      taskRepositoryProvider,
                                                    )
                                                    .updateTaskStatus(
                                                      task.id,
                                                      'IN_PROGRESS',
                                                    );

                                                if (context.mounted) {
                                                  ScaffoldMessenger.of(
                                                    context,
                                                  ).showSnackBar(
                                                    const SnackBar(
                                                      content: Text(
                                                        'Task accepted! Go get it!',
                                                      ),
                                                    ),
                                                  );
                                                }
                                              } catch (e) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  SnackBar(
                                                    content: Text(
                                                      'Error accepting task: $e',
                                                    ),
                                                    backgroundColor: Colors.red,
                                                  ),
                                                );
                                              }
                                            },
                                            style: FilledButton.styleFrom(
                                              backgroundColor: accent,
                                              foregroundColor: colors.onPrimary,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(14),
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
                                            ),
                                            icon: const Icon(
                                              Icons.check_circle,
                                            ),
                                            label: const Text('Accept'),
                                          ),
                                        ),
                                    ],
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
                                ],
                              ),
                            )
                            .animate(delay: (48 * index).ms)
                            .fade(duration: 350.ms)
                            .slideY(
                              begin: 0.1,
                              end: 0,
                              curve: Curves.easeOutCubic,
                            )
                            .scaleXY(begin: 0.975, end: 1);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
