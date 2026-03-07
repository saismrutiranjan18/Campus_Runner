import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/config/app_mode.dart';
import 'presentation/screens/splash_screen.dart';
import 'core/themes/theme_provider.dart';
import 'presentation/screens/home/runner_home_screen.dart';

FirebaseOptions? _firebaseOptionsFromEnv() {
  const apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  const appId = String.fromEnvironment('FIREBASE_APP_ID');
  const messagingSenderId = String.fromEnvironment(
    'FIREBASE_MESSAGING_SENDER_ID',
  );
  const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  const authDomain = String.fromEnvironment('FIREBASE_AUTH_DOMAIN');
  const storageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET');
  const measurementId = String.fromEnvironment('FIREBASE_MEASUREMENT_ID');

  if (apiKey.isEmpty ||
      appId.isEmpty ||
      messagingSenderId.isEmpty ||
      projectId.isEmpty) {
    return null;
  }

  return FirebaseOptions(
    apiKey: apiKey,
    appId: appId,
    messagingSenderId: messagingSenderId,
    projectId: projectId,
    authDomain: authDomain.isEmpty ? null : authDomain,
    storageBucket: storageBucket.isEmpty ? null : storageBucket,
    measurementId: measurementId.isEmpty ? null : measurementId,
  );
}

bool _needsExplicitOptions() {
  return kIsWeb || defaultTargetPlatform == TargetPlatform.windows;
}

void main() async {
  // 1. Initialize Flutter Bindings
  WidgetsFlutterBinding.ensureInitialized();

  // 2. Initialize Firebase only when backend mode is enabled.
  if (AppMode.backendEnabled) {
    try {
      final options = _needsExplicitOptions()
          ? _firebaseOptionsFromEnv()
          : null;
      if (options == null && _needsExplicitOptions()) {
        throw Exception(
          'Missing Firebase options. Provide --dart-define values for web/windows.',
        );
      }

      if (options != null) {
        await Firebase.initializeApp(options: options);
      } else {
        await Firebase.initializeApp();
      }
      debugPrint("✅ Firebase Initialized Successfully");
    } catch (e) {
      debugPrint("❌ Firebase Initialization Failed: $e");
    }
  } else {
    debugPrint("ℹ️ Running in demo mode (backend disabled)");
  }

  // 3. Run App wrapped in ProviderScope (Required for Riverpod)
  runApp(const ProviderScope(child: CampusRunnerApp()));
}

class CampusRunnerApp extends ConsumerWidget {
  const CampusRunnerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Campus Runner',

      // --- THEME SETUP (Deep Blue & Gold) ---
      theme: FlexThemeData.light(
        scheme: FlexScheme.bahamaBlue,
        textTheme: GoogleFonts.poppinsTextTheme(),
        useMaterial3: true,
      ),
      darkTheme: FlexThemeData.dark(
        scheme: FlexScheme.bahamaBlue,
        textTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().textTheme),
        useMaterial3: true,
      ),
      themeMode: themeMode,
      // --- HOME SCREEN ---
      // Guest browsing by default.
      home: const SplashScreen(),
    );
  }
}
