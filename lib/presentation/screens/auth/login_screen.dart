import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // <<<--- ADDED IMPORT
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

// Project Imports
import '../../../logic/auth_provider.dart'; // <<<--- ADDED IMPORT
import '../home/runner_home_screen.dart';

// 1. CONVERT TO CONSUMERSTATEFULWIDGET
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  // State to handle the button spinner
  bool _isLoading = false;

  // --- NEW AUTHENTICATION LOGIC ---
  void _continueWithGoogle() async {
    setState(() => _isLoading = true);
    
    // Read the AuthRepository and call the Google Sign-In function
    final user = await ref.read(authRepositoryProvider).signInWithGoogle();

    if (mounted) {
      setState(() => _isLoading = false);
      
      if (user != null) {
        // Sign-in successful, replace screen with RunnerHomeScreen
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const RunnerHomeScreen()),
        );
      } else {
        // Sign-in failed or user cancelled
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Google Sign-In failed or cancelled.")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        padding: const EdgeInsets.all(24),
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).primaryColor,
              Theme.of(context).primaryColorDark,
            ],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // LOGO ANIMATION
            Icon(PhosphorIcons.sneakerMove(PhosphorIconsStyle.fill), size: 80, color: Colors.white)
                .animate()
                .scale(duration: 600.ms, curve: Curves.easeOutBack),
            
            const SizedBox(height: 20),
            
            const Text(
              "Campus Runner",
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
            ).animate().fade().slideY(begin: 0.3, end: 0),
            
            const SizedBox(height: 10),
            
            const Text(
              "Earn money while you walk.\nGet food without moving.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
            
            const SizedBox(height: 60),

            // GOOGLE LOGIN BUTTON
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _continueWithGoogle, // Call the new logic
                icon: _isLoading 
                    ? const SizedBox(
                        height: 20, 
                        width: 20, 
                        child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.blue))
                      )
                    : Icon(PhosphorIcons.googleLogo(), color: Theme.of(context).primaryColor),
                label: Text(
                  _isLoading ? "Signing In..." : "Continue with College Email", // Update button text
                  style: TextStyle(
                    fontSize: 16, 
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Theme.of(context).primaryColor,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ).animate().fade(delay: 500.ms).slideY(begin: 0.5, end: 0),
            
            const SizedBox(height: 20),
            const Text(
              "Only @university.edu.in emails allowed",
              style: TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}