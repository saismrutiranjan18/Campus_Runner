import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class StorageRepository {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Function to upload the file and return its URL
  Future<String> uploadFile(File file, String path) async {
    try {
      // 1. Create a reference (storage location)
      final storageRef = _storage.ref().child(path);
      
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