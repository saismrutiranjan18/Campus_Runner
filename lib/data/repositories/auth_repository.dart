import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../core/config/app_mode.dart';
import '../models/user_model.dart';
import 'user_repository.dart';

class AuthResult {
  final User? user;
  final UserModel? userProfile;
  final bool isNewUser;
  final String? errorMessage;

  const AuthResult({
    this.user,
    this.userProfile,
    this.isNewUser = false,
    this.errorMessage,
  });
}

class AuthRepository {
<<<<<<< HEAD
  static const String allowedDomain = 'vitbhopal.ac.in';

=======
  // FIX 1: Initializing GoogleSignIn instance
>>>>>>> b96398b (local changes)
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email'],
    hostedDomain: allowedDomain,
  );
<<<<<<< HEAD

  final UserRepository _userRepository = UserRepository();

  Future<AuthResult> signInWithGoogle() async {
    if (!AppMode.backendEnabled) {
      return const AuthResult(
        errorMessage: 'Login is disabled in demo mode.',
      );
    }
=======
  
  final FirebaseAuth _auth = FirebaseAuth.instance;
>>>>>>> b96398b (local changes)

    try {
<<<<<<< HEAD
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return const AuthResult(errorMessage: 'Sign-in cancelled.');
      }

      final email = googleUser.email.toLowerCase();
      if (!email.endsWith('@$allowedDomain')) {
        await _googleSignIn.signOut();
        return const AuthResult(
          errorMessage: 'Please use your @vitbhopal.ac.in email ID.',
        );
      }

      final googleAuth = await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
        accessToken: googleAuth.accessToken,
      );

      final userCredential = await FirebaseAuth.instance.signInWithCredential(
        credential,
      );

      final user = userCredential.user;
      if (user == null) {
        return const AuthResult(errorMessage: 'Authentication failed');
      }

      final userExists = await _userRepository.userExists(user.uid);

      UserModel? userProfile;

      if (!userExists) {
        userProfile = UserModel(
          userId: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? 'Campus Runner',
          phoneNumber: user.phoneNumber ?? '',
          photoUrl: user.photoURL,
          campusId: 'vit-bhopal',
          campusName: 'VIT Bhopal',
          role: UserRole.both,
          joinedAt: DateTime.now(),
        );

        await _userRepository.createUserProfile(userProfile);
      } else {
        userProfile = await _userRepository.getUserProfile(user.uid);
      }

      return AuthResult(
        user: user,
        userProfile: userProfile,
        isNewUser: !userExists,
      );
    } on FirebaseAuthException catch (e) {
      return AuthResult(errorMessage: e.message ?? e.code);
=======
      // FIX 2: Using the initialized instance object to call signIn()
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn(); 

      if (googleUser == null) {
        return null; // User cancelled
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      // FIX 3: We rely on idToken for newer Firebase versions and set accessToken to null
      final AuthCredential credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken, 
        accessToken: null, // Set to null for maximum stability against recent Google API changes
      );

      final UserCredential userCredential = await _auth.signInWithCredential(credential);
      
      return userCredential.user;
>>>>>>> b96398b (local changes)
    } catch (e) {
      return AuthResult(errorMessage: e.toString());
    }
  }

<<<<<<< HEAD
  User? getCurrentUser() =>
      AppMode.backendEnabled ? FirebaseAuth.instance.currentUser : null;

  Future<void> signOut() async {
    if (!AppMode.backendEnabled) return;

    await _googleSignIn.signOut();
    await FirebaseAuth.instance.signOut();
  }
}
=======
  // Check if a user is currently logged in
  User? getCurrentUser() => _auth.currentUser;
}
>>>>>>> b96398b (local changes)
