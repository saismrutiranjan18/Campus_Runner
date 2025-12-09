import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/storage_repository.dart';

final storageRepositoryProvider = Provider((ref) => StorageRepository());