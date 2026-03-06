import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/services/location_service.dart';

final locationServiceProvider = Provider((ref) => LocationService());
