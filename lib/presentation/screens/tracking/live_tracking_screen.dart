import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../../../data/models/task_model.dart';
import '../../../core/constants/app_constants.dart';

class LiveTrackingScreen extends ConsumerStatefulWidget {
  final TaskModel task;

  const LiveTrackingScreen({super.key, required this.task});

  @override
  ConsumerState<LiveTrackingScreen> createState() =>
      _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends ConsumerState<LiveTrackingScreen> {
  GoogleMapController? _mapController;
  StreamSubscription<DocumentSnapshot>? _taskSubscription;
  LatLng? _runnerPosition;
  LatLng? _pickupPosition;
  LatLng? _dropPosition;
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};

  @override
  void initState() {
    super.initState();
    _initializeLocations();
    _listenToLocationUpdates();
  }

  void _initializeLocations() {
    final pickupCoords = AppConstants.zoneCoordinates[widget.task.pickup];
    final dropCoords = AppConstants.zoneCoordinates[widget.task.drop];

    if (pickupCoords != null) {
      _pickupPosition = LatLng(pickupCoords[0], pickupCoords[1]);
    }
    if (dropCoords != null) {
      _dropPosition = LatLng(dropCoords[0], dropCoords[1]);
    }

    _updateMarkers();
  }

  void _listenToLocationUpdates() {
    _taskSubscription = FirebaseFirestore.instance
        .collection('tasks')
        .doc(widget.task.id)
        .snapshots()
        .listen((snapshot) {
      if (!snapshot.exists) return;

      final data = snapshot.data();
      if (data == null) return;

      final lat = data['runnerLatitude']?.toDouble();
      final lon = data['runnerLongitude']?.toDouble();

      if (lat != null && lon != null) {
        setState(() {
          _runnerPosition = LatLng(lat, lon);
          _updateMarkers();
          _updatePolylines();
        });

        _mapController?.animateCamera(
          CameraUpdate.newLatLng(_runnerPosition!),
        );
      }
    });
  }

  void _updateMarkers() {
    _markers.clear();

    if (_pickupPosition != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: _pickupPosition!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueGreen,
          ),
          infoWindow: InfoWindow(
            title: 'Pickup',
            snippet: widget.task.pickup,
          ),
        ),
      );
    }

    if (_dropPosition != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('drop'),
          position: _dropPosition!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueRed,
          ),
          infoWindow: InfoWindow(
            title: 'Drop',
            snippet: widget.task.drop,
          ),
        ),
      );
    }

    if (_runnerPosition != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('runner'),
          position: _runnerPosition!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueBlue,
          ),
          infoWindow: const InfoWindow(
            title: 'Runner',
            snippet: 'Current location',
          ),
        ),
      );
    }
  }

  void _updatePolylines() {
    _polylines.clear();

    if (_runnerPosition != null && _pickupPosition != null) {
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('toPickup'),
          points: [_runnerPosition!, _pickupPosition!],
          color: Colors.blue,
          width: 3,
        ),
      );
    }

    if (_pickupPosition != null && _dropPosition != null) {
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('pickupToDrop'),
          points: [_pickupPosition!, _dropPosition!],
          color: Colors.green,
          width: 3,
          patterns: [PatternItem.dash(20), PatternItem.gap(10)],
        ),
      );
    }
  }

  @override
  void dispose() {
    _taskSubscription?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final initialPosition = _runnerPosition ?? _pickupPosition ?? const LatLng(23.2599, 77.4126);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Tracking'),
        actions: [
          IconButton(
            icon: Icon(PhosphorIcons.navigationArrow()),
            onPressed: () {
              if (_runnerPosition != null) {
                _mapController?.animateCamera(
                  CameraUpdate.newLatLngZoom(_runnerPosition!, 16),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.task.title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      PhosphorIcons.mapPin(),
                      size: 16,
                      color: Colors.green,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        widget.task.pickup,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    Icon(
                      PhosphorIcons.arrowRight(),
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      PhosphorIcons.mapPin(),
                      size: 16,
                      color: Colors.red,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        widget.task.drop,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
                if (widget.task.locationLastUpdated != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Last updated: ${_formatTime(widget.task.locationLastUpdated!)}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: initialPosition,
                zoom: 15,
              ),
              markers: _markers,
              polylines: _polylines,
              myLocationEnabled: false,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              onMapCreated: (controller) {
                _mapController = controller;
              },
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else {
      return '${difference.inHours}h ago';
    }
  }
}
