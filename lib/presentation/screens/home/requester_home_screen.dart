import 'dart:io'; 
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:file_picker/file_picker.dart'; 
import 'package:uuid/uuid.dart'; // <<<--- MISSING IMPORT ADDED HERE

// Project Imports
import '../../../core/constants/app_constants.dart';
import '../../widgets/inputs/primary_button.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/task_model.dart';
import '../../../logic/task_provider.dart';
import '../../../logic/storage_provider.dart'; 

// 1. Change to ConsumerStatefulWidget
class RequesterHomeScreen extends ConsumerStatefulWidget {
  const RequesterHomeScreen({super.key});

  @override
  ConsumerState<RequesterHomeScreen> createState() => _RequesterHomeScreenState();
}

class _RequesterHomeScreenState extends ConsumerState<RequesterHomeScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // State variables for form fields
  String? _selectedPickup;
  String? _selectedDrop;
  final TextEditingController _itemController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  
  // State variables for file picker
  File? _selectedFile;
  String? _fileName;

  bool _isUploading = false;

  @override
  void dispose() {
    _itemController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  // --- NEW FUNCTION: FILE PICKER ---
  Future<void> _pickFile() async {
    // Only allow PDF files
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );

    if (result != null) {
      // NOTE: We need the 'dart:io' import for the File object
      final file = File(result.files.single.path!); 
      setState(() {
        _selectedFile = file;
        _fileName = result.files.single.name;
      });
    }
  }

  // THE MAIN FUNCTION: Saves data to Firebase
  void _postTask() async {
    // Check if a file is required and present
    if (_selectedFile == null) {
       ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Please select a PDF file to print.")),
        );
      return;
    }
    
    if (_formKey.currentState!.validate()) {
      setState(() => _isUploading = true); 

      try {
        // --- STEP 1: UPLOAD FILE TO STORAGE ---
        final storageRepo = ref.read(storageRepositoryProvider);
        // Use Uuid() here to generate a secure, unique folder name
        final uniqueFileName = '${DateTime.now().millisecondsSinceEpoch}_$_fileName';
        final storagePath = 'tasks/${const Uuid().v4()}/$uniqueFileName';
        
        // Get the final permanent URL
        final fileUrl = await storageRepo.uploadFile(_selectedFile!, storagePath);


        // --- STEP 2: SAVE TASK WITH URL TO FIRESTORE ---
        final newTask = TaskModel(
          id: '', 
          requesterId: 'TEMP_USER_ID', 
          title: _itemController.text,
          pickup: _selectedPickup!,
          drop: _selectedDrop!,
          price: _priceController.text,
          status: 'OPEN',
          createdAt: DateTime.now(),
          fileUrl: fileUrl, // PASS THE NEW URL
        );

        await ref.read(taskRepositoryProvider).addTask(newTask);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Task Posted Successfully! File Uploaded!")),
          );
          Navigator.pop(context); 
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Upload Error: ${e.toString()}"), backgroundColor: Colors.red),
        );
      } finally {
        if (mounted) setState(() => _isUploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Request a Runner"),
        leading: IconButton(
          icon: Icon(PhosphorIcons.x()),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- LOCATION DROPDOWNS ---
              _buildSectionTitle("Where to go?"),
              const SizedBox(height: 12),
              
              DropdownButtonFormField<String>(
                value: _selectedPickup,
                decoration: _inputDecoration("Pickup Location", PhosphorIcons.storefront()),
                items: AppConstants.pickupZones.map((zone) {
                  return DropdownMenuItem(value: zone, child: Text(zone));
                }).toList(),
                onChanged: (val) => setState(() => _selectedPickup = val),
                validator: (val) => AppValidators.validateRequired(val, "Pickup"),
              ),
              
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedDrop,
                decoration: _inputDecoration("Drop Location", PhosphorIcons.mapPin()),
                items: AppConstants.dropZones.map((zone) {
                  return DropdownMenuItem(value: zone, child: Text(zone));
                }).toList(),
                onChanged: (val) => setState(() => _selectedDrop = val),
                validator: (val) => AppValidators.validateRequired(val, "Drop location"),
              ),
              // --- END LOCATION DROPDOWNS ---

              const SizedBox(height: 24),
              _buildSectionTitle("What do you need?"),
              const SizedBox(height: 12),

              // ITEM NAME
              TextFormField(
                controller: _itemController,
                decoration: _inputDecoration("e.g. Printing a 10-page doc", PhosphorIcons.shoppingBag()),
                validator: (val) => AppValidators.validateRequired(val, "Item name"),
              ),

              const SizedBox(height: 24),
              _buildSectionTitle("Upload Document (PDF only)"),
              const SizedBox(height: 12),

              // --- FILE PICKER UI ---
              OutlinedButton.icon(
                icon: Icon(PhosphorIcons.filePdf()),
                label: Text(_fileName ?? "Select PDF File..."),
                onPressed: _pickFile,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: _selectedFile != null ? Colors.green : Colors.grey),
                ),
              ),
              if (_selectedFile != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    "File Ready: $_fileName", 
                    style: const TextStyle(color: Colors.green, fontSize: 13),
                  ),
                ),
              // --- END FILE PICKER UI ---
              
              const SizedBox(height: 24),
              _buildSectionTitle("Runner Fee (Tip)"),
              const SizedBox(height: 12),

              // PRICE INPUT
              TextFormField(
                controller: _priceController,
                keyboardType: TextInputType.number,
                decoration: _inputDecoration("₹20", PhosphorIcons.currencyInr()),
                validator: AppValidators.validatePrice,
              ),
              
              const SizedBox(height: 8),
              Text(
                "Suggested: ₹20 for nearby, ₹40 for far hostels.",
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),

              const SizedBox(height: 40),

              // SUBMIT BUTTON
              PrimaryButton(
                text: "Post Task",
                isLoading: _isUploading,
                onPressed: _postTask,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- HELPER FUNCTIONS ---
  InputDecoration _inputDecoration(String hint, IconData icon) {
     return InputDecoration(
      prefixIcon: Icon(icon),
      hintText: hint,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      filled: true,
      fillColor: Theme.of(context).cardColor,
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
    );
  }
}