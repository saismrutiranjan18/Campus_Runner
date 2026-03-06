import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/config/app_mode.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/user_provider.dart';
import '../../../data/models/user_model.dart';
import '../auth/login_screen.dart';
import 'edit_profile_screen.dart';
import '../auth/phone_verification_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _handleAuthAction(BuildContext context, WidgetRef ref) async {
    final authRepository = ref.read(authRepositoryProvider);
    final isLoggedIn = authRepository.getCurrentUser() != null;

    if (!isLoggedIn) {
      final result = await Navigator.push<bool>(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );

      if (result == true && context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Signed in successfully')));
      }
      return;
    }

    await authRepository.signOut();

    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Logged out')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final user = ref.watch(authRepositoryProvider).getCurrentUser();
    final userProfileAsync = ref.watch(currentUserProfileProvider);
    final isDemo = !AppMode.backendEnabled;

    return userProfileAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: Center(child: Text('Error: $error')),
      ),
      data: (userProfile) {
        final displayName = userProfile?.displayName ?? 
            (user?.displayName?.trim().isNotEmpty == true
                ? user!.displayName!
                : 'Campus Runner');
        final email = userProfile?.email ?? 
            (user?.email ?? (isDemo ? 'demo@campusrunner.app' : 'Guest user'));
        final initials = displayName
            .split(' ')
            .where((part) => part.isNotEmpty)
            .take(2)
            .map((part) => part[0].toUpperCase())
            .join();

        return Scaffold(
          appBar: AppBar(title: const Text('Profile')),
          body: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        colors.primaryContainer.withValues(alpha: 0.35),
                        colors.secondaryContainer.withValues(alpha: 0.25),
                        colors.surface,
                      ],
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        color: colors.surface.withValues(alpha: 0.72),
                        border: Border.all(
                          color: colors.outlineVariant.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 34,
                            backgroundColor: colors.primaryContainer,
                            backgroundImage: userProfile?.photoUrl != null
                                ? NetworkImage(userProfile!.photoUrl!)
                                : (user?.photoURL != null
                                    ? NetworkImage(user!.photoURL!)
                                    : null),
                            child: userProfile?.photoUrl == null && user?.photoURL == null
                                ? Text(
                                    initials.isEmpty ? 'CR' : initials,
                                    style: theme.textTheme.titleLarge?.copyWith(
                                      color: colors.onPrimaryContainer,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  displayName,
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  email,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: colors.onSurfaceVariant,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: colors.tertiaryContainer.withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    userProfile == null
                                        ? 'Guest Mode'
                                        : (userProfile.isVerified
                                            ? 'Verified ${_getRoleLabel(userProfile.role)}'
                                            : 'Unverified'),
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      color: colors.onTertiaryContainer,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ).animate().fade(duration: 300.ms).slideY(begin: 0.08, end: 0),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            icon: PhosphorIcons.checkCircle(),
                            title: 'Completed',
                            value: '${userProfile?.completedTasks ?? 0}',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _StatCard(
                            icon: PhosphorIcons.star(),
                            title: 'Rating',
                            value: userProfile?.rating.toStringAsFixed(1) ?? '0.0',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _StatCard(
                            icon: PhosphorIcons.users(),
                            title: 'Reviews',
                            value: '${userProfile?.totalRatings ?? 0}',
                          ),
                        ),
                      ],
                    )
                        .animate()
                        .fade(delay: 120.ms, duration: 320.ms)
                        .slideY(begin: 0.1, end: 0),
                    const SizedBox(height: 16),
                    if (userProfile != null && !userProfile.isVerified)
                      _ActionTile(
                        icon: PhosphorIcons.shieldCheck(),
                        title: 'Verify Phone Number',
                        subtitle: 'Verify to accept tasks',
                        onTap: () async {
                          final result = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PhoneVerificationScreen(
                                userProfile: userProfile,
                              ),
                            ),
                          );
                          if (result == true && context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Phone verified successfully!'),
                              ),
                            );
                          }
                        },
                      ),
                    if (userProfile != null && !userProfile.isVerified)
                      const SizedBox(height: 10),
                    if (userProfile != null)
                      _ActionTile(
                        icon: PhosphorIcons.userCircleGear(),
                        title: 'Edit profile',
                        subtitle: 'Update your details',
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => EditProfileScreen(userProfile: userProfile),
                            ),
                          );
                        },
                      ),
                    if (userProfile != null) const SizedBox(height: 10),
                    _ActionTile(
                      icon: PhosphorIcons.mapTrifold(),
                      title: 'Saved routes',
                      subtitle: 'Manage your frequently used paths',
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Saved routes coming soon')),
                        );
                      },
                    ),
                    const SizedBox(height: 10),
                    _ActionTile(
                      icon: PhosphorIcons.bellRinging(),
                      title: 'Notification preferences',
                      subtitle: 'Customize your alerts',
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Notification settings soon'),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: () => _handleAuthAction(context, ref),
                      icon: Icon(
                        user == null
                            ? PhosphorIcons.signIn()
                            : PhosphorIcons.signOut(),
                      ),
                      label: Text(user == null ? 'Sign In' : 'Log Out'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ).animate().fade(delay: 220.ms, duration: 350.ms),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _getRoleLabel(UserRole role) {
    switch (role) {
      case UserRole.runner:
        return 'Runner';
      case UserRole.requester:
        return 'Requester';
      case UserRole.both:
        return 'Runner';
    }
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
  });

  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: colors.surface.withValues(alpha: 0.7),
        border: Border.all(color: colors.outlineVariant.withValues(alpha: 0.35)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 19, color: colors.primary),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: theme.textTheme.labelSmall?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: colors.surface.withValues(alpha: 0.68),
            border: Border.all(color: colors.outlineVariant.withValues(alpha: 0.28)),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: colors.primaryContainer.withValues(alpha: 0.75),
                ),
                child: Icon(icon, color: colors.onPrimaryContainer),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                PhosphorIcons.caretRight(),
                size: 16,
                color: colors.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
