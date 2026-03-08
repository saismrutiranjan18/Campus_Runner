import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class NotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Request permission
    await _firebaseMessaging.requestPermission();

    // Get FCM token
    String? token = await _firebaseMessaging.getToken();

    print("FCM Token: $token");

    if (token != null) {
    final user = FirebaseAuth.instance.currentUser;

    if (user != null) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .update({
        'fcmToken': token,
        });
    }
    }

    // Listen for foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print("New notification received: ${message.notification?.title}");
    });
  }
}