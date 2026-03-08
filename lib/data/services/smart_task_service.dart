import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'dart:math';

class SmartTaskService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  double _calculateDistance(LatLng a, LatLng b) {
    const double earthRadius = 6371; // km

    final dLat = _degToRad(b.latitude - a.latitude);
    final dLon = _degToRad(b.longitude - a.longitude);

    final lat1 = _degToRad(a.latitude);
    final lat2 = _degToRad(b.latitude);

    final aVal =
        sin(dLat / 2) * sin(dLat / 2) +
        sin(dLon / 2) *
            sin(dLon / 2) *
            cos(lat1) *
            cos(lat2);

    final c = 2 * atan2(sqrt(aVal), sqrt(1 - aVal));

    return earthRadius * c;
  }

  double _degToRad(double deg) {
    return deg * (pi / 180);
  }

  Future<List<QueryDocumentSnapshot>> getRecommendedTasks(
      LatLng runnerLocation) async {
    final snapshot =
        await _firestore.collection('tasks').where('status', isEqualTo: 'OPEN').get();

    final tasks = snapshot.docs;

    tasks.sort((a, b) {
      final pickupA = LatLng(
        a['pickupLatitude'],
        a['pickupLongitude'],
      );

      final pickupB = LatLng(
        b['pickupLatitude'],
        b['pickupLongitude'],
      );

      final distanceA = _calculateDistance(runnerLocation, pickupA);
      final distanceB = _calculateDistance(runnerLocation, pickupB);

      return distanceA.compareTo(distanceB);
    });

    return tasks.take(5).toList();
  }
}