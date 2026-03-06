import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  StreamSubscription<Position>? _positionStream;
  String? _activeTaskId;
  Timer? _batchTimer;
  Position? _lastPosition;
  DateTime? _lastUpdateTime;
  int _retryCount = 0;
  static const int _maxRetries = 3;
  static const Duration _batchInterval = Duration(seconds: 30);

  Future<bool> requestLocationPermission() async {
    final status = await Permission.location.request();
    if (status.isGranted) {
      return true;
    }
    if (status.isPermanentlyDenied) {
      await openAppSettings();
    }
    return false;
  }

  Future<bool> checkLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  Future<Position?> getCurrentLocation() async {
    try {
      final hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      final serviceEnabled = await checkLocationServiceEnabled();
      if (!serviceEnabled) return null;

      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      );
    } catch (e) {
      return null;
    }
  }

  void startLocationTracking(String taskId) {
    if (_positionStream != null) {
      stopLocationTracking();
    }

    _activeTaskId = taskId;
    _retryCount = 0;

    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50,
      ),
    ).listen((Position position) {
      _lastPosition = position;
    });

    _batchTimer = Timer.periodic(_batchInterval, (_) {
      if (_lastPosition != null) {
        _updateTaskLocationWithRetry(taskId, _lastPosition!);
      }
    });
  }

  Future<void> _updateTaskLocationWithRetry(
    String taskId,
    Position position,
  ) async {
    try {
      await FirebaseFirestore.instance.collection('tasks').doc(taskId).update({
        'runnerLatitude': position.latitude,
        'runnerLongitude': position.longitude,
        'locationLastUpdated': DateTime.now().millisecondsSinceEpoch,
      });
      _lastUpdateTime = DateTime.now();
      _retryCount = 0;
    } catch (e) {
      _retryCount++;
      if (_retryCount < _maxRetries) {
        final delay = Duration(seconds: 2 * _retryCount);
        await Future.delayed(delay);
        await _updateTaskLocationWithRetry(taskId, position);
      }
    }
  }

  void stopLocationTracking() {
    _positionStream?.cancel();
    _batchTimer?.cancel();
    _positionStream = null;
    _batchTimer = null;
    _activeTaskId = null;
    _lastPosition = null;
    _retryCount = 0;
  }

  Future<void> cleanupOldLocationData(String taskId) async {
    try {
      final cutoffTime = DateTime.now().subtract(const Duration(hours: 24));
      await FirebaseFirestore.instance.collection('tasks').doc(taskId).update({
        'locationHistory': FieldValue.arrayRemove([
          {'timestamp': cutoffTime.millisecondsSinceEpoch}
        ]),
      });
    } catch (e) {
      return;
    }
  }

  bool get isTracking => _positionStream != null;
  String? get activeTaskId => _activeTaskId;
  DateTime? get lastUpdateTime => _lastUpdateTime;

  Future<double> calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) async {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  Future<bool> isNearLocation(
    double currentLat,
    double currentLon,
    double targetLat,
    double targetLon, {
    double radiusInMeters = 50,
  }) async {
    final distance = await calculateDistance(
      currentLat,
      currentLon,
      targetLat,
      targetLon,
    );
    return distance <= radiusInMeters;
  }
}
