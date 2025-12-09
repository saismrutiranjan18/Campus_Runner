import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:google_fonts/google_fonts.dart';

// --- IMPORTANT FIX HERE ---
// Ensure this line does NOT have '//' in front of it.
import 'firebase_options.dart'; 
// --------------------------

import 'presentation/screens/auth/login_screen.dart';

void main() async {
  // 1. Initialize Flutter Bindings
  WidgetsFlutterBinding.ensureInitialized();

  // 2. Initialize Firebase
  // Using a try-catch block is safer to see errors in the console
  try {
    await Firebase.initializeApp();
    // If you have a generated `firebase_options.dart` that provides
    // `DefaultFirebaseOptions`, restore the import at the top and replace
    // the call above with:
    // await Firebase.initializeApp(
    //   options: DefaultFirebaseOptions.currentPlatform,
    // );
    debugPrint("✅ Firebase Initialized Successfully");
  } catch (e) {
    debugPrint("❌ Firebase Initialization Failed: $e");
  }

  // 3. Run App wrapped in ProviderScope (Required for Riverpod)
  runApp(
    const ProviderScope(
      child: CampusRunnerApp(),
    ),
  );
}

class CampusRunnerApp extends StatelessWidget {
  const CampusRunnerApp({super.key});

  @override
  Widget build(BuildContext context) {
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
      themeMode: ThemeMode.system, // Auto-switch based on phone settings

      // --- HOME SCREEN ---
      // Starts at Login.
      home: const LoginScreen(),
    );
  }
}