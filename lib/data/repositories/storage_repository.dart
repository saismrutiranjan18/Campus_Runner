import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import '../../core/config/app_mode.dart';

class StorageRepository {
  // Function to upload the file and return its URL
  Future<String> uploadFile(File file, String path) async {
    if (!AppMode.backendEnabled) {
      return 'file://${file.path}';
    }

    try {
      final storage = FirebaseStorage.instance;
      // 1. Create a reference (storage location)
      final storageRef = storage.ref().child(path);
      
      // 2. Start the upload task
      final uploadTask = storageRef.putFile(file);
      
      // 3. Wait for the upload to complete
      final snapshot = await uploadTask.whenComplete(() {});
      
      // 4. Get the final public URL
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      return downloadUrl;
    } catch (e) {
      throw Exception('Failed to upload file: $e');
    }
  }
}