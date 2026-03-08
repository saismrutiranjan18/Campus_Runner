import 'dart:math';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class ETAService {

  static double _degToRad(double deg) {
    return deg * (pi / 180);
  }

  static double calculateDistance(LatLng start, LatLng end) {
    const earthRadius = 6371; // km

    final dLat = _degToRad(end.latitude - start.latitude);
    final dLon = _degToRad(end.longitude - start.longitude);

    final lat1 = _degToRad(start.latitude);
    final lat2 = _degToRad(end.latitude);

    final a =
        sin(dLat / 2) * sin(dLat / 2) +
        sin(dLon / 2) *
            sin(dLon / 2) *
            cos(lat1) *
            cos(lat2);

    final c = 2 * atan2(sqrt(a), sqrt(1 - a));

    return earthRadius * c;
  }

  static int estimateMinutes(double distanceKm, String transportMode) {
    double speed;

    switch (transportMode) {
      case "Walking":
        speed = 5;
        break;
      case "Bike":
        speed = 20;
        break;
      case "Car":
        speed = 40;
        break;
      default:
        speed = 10;
    }

    final hours = distanceKm / speed;

    return (hours * 60).round();
  }
}