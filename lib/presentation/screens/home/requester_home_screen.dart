import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:file_picker/file_picker.dart';
import 'package:uuid/uuid.dart'; // <<<--- MISSING IMPORT ADDED HERE
import 'package:speech_to_text/speech_to_text.dart' as stt;

// Project Imports
import '../../../core/config/app_mode.dart';
import '../../../core/constants/app_constants.dart';
import '../../widgets/inputs/primary_button.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/task_model.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/campus_provider.dart';
import '../../../logic/task_provider.dart';
import '../../../logic/storage_provider.dart';
import '../auth/login_screen.dart';
import '../tracking/my_tasks_screen.dart';

// 1. Change to ConsumerStatefulWidget
class RequesterHomeScreen extends ConsumerStatefulWidget {
  const RequesterHomeScreen({super.key});

  @override
  ConsumerState<RequesterHomeScreen> createState() =>
      _RequesterHomeScreenState();
}

class _RequesterHomeScreenState extends ConsumerState<RequesterHomeScreen> {
  final _formKey = GlobalKey<FormState>();

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  String _lastTranscript = '';

  // State variables for form fields
  String? _selectedCampusId;
  String? _selectedCampusName;
  String? _selectedPickup;
  String? _selectedDrop;
  String? _selectedTransportMode;
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

  Future<void> _toggleListening() async {
    if (_isListening) {
      await _speech.stop();
      if (mounted) setState(() => _isListening = false);
      return;
    }

    final available = await _speech.initialize(
      onError: (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Voice error: ${error.errorMsg}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      onStatus: (status) {
        if (status == 'notListening' && mounted) {
          setState(() => _isListening = false);
        }
      },
    );

    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Speech recognition not available.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    setState(() => _isListening = true);
    await _speech.listen(
      onResult: (result) {
        if (!mounted) return;
        setState(() => _lastTranscript = result.recognizedWords);
        if (result.finalResult) {
          _applyVoiceCommand(result.recognizedWords);
        }
      },
    );
  }

  void _applyVoiceCommand(String text) {
    final normalized = text.toLowerCase();

    final campusesValue = ref.read(campusesStreamProvider);
    final campusNames = campusesValue.value?.map((c) => c.name).toList() ?? [];

    final pickupMatch = _matchZone(normalized, AppConstants.pickupZones);
    if (pickupMatch != null && normalized.contains('pickup')) {
      setState(() => _selectedPickup = pickupMatch);
    }

    final dropMatch = _matchZone(normalized, AppConstants.dropZones);
    if (dropMatch != null &&
        (normalized.contains('drop') || normalized.contains('deliver'))) {
      setState(() => _selectedDrop = dropMatch);
    }

    final campusMatch = _matchByName(normalized, campusNames);
    if (campusMatch != null && normalized.contains('campus')) {
      final campuses = campusesValue.value ?? [];
      final selected = campuses.firstWhere(
        (campus) => campus.name == campusMatch,
        orElse: () => campuses.first,
      );
      setState(() {
        _selectedCampusId = selected.id;
        _selectedCampusName = selected.name;
      });
    }

    final itemText = _extractAfter(normalized, ['item', 'need', 'request']);
    if (itemText != null && itemText.isNotEmpty) {
      _itemController.text = _capitalize(itemText);
    }

    final transport = _matchTransportMode(normalized);
    if (transport != null) {
      setState(() => _selectedTransportMode = transport);
    }

    final priceMatch = RegExp(r'(price|tip|amount)\s+(\d+)').firstMatch(
      normalized,
    );
    if (priceMatch != null) {
      _priceController.text = priceMatch.group(2) ?? _priceController.text;
    }

    if (normalized.contains('post task') || normalized.contains('submit')) {
      _postTask();
    }
  }

  String? _matchZone(String text, List<String> zones) {
    return _matchByName(text, zones);
  }

  String? _matchByName(String text, List<String> options) {
    for (final option in options) {
      if (text.contains(option.toLowerCase())) {
        return option;
      }
    }
    return null;
  }

  String? _extractAfter(String text, List<String> keywords) {
    for (final kw in keywords) {
      final pattern = '$kw\\s+(.*)';
      final match = RegExp(pattern).firstMatch(text);
      if (match != null) {
        return match.group(1)?.trim();
      }
    }
    return null;
  }

  String _capitalize(String value) {
    if (value.isEmpty) return value;
    return value[0].toUpperCase() + value.substring(1);
  }

  String? _matchTransportMode(String text) {
    if (text.contains('walk')) return 'Walking';
    if (text.contains('cycle') || text.contains('bike')) return 'Cycling';
    if (text.contains('vehicle') || text.contains('car')) return 'Vehicle';
    return null;
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
    var user = ref.read(authRepositoryProvider).getCurrentUser();
    if (AppMode.backendEnabled && user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to post a task.'),
          backgroundColor: Colors.red,
        ),
      );

      final loggedIn = await Navigator.push<bool>(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );

      if (loggedIn != true || !mounted) return;
      user = ref.read(authRepositoryProvider).getCurrentUser();
      if (user == null) return;
    }

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
        final uniqueFileName =
            '${DateTime.now().millisecondsSinceEpoch}_$_fileName';
        final storagePath = 'tasks/${const Uuid().v4()}/$uniqueFileName';

        // Get the final permanent URL
        final fileUrl = await storageRepo.uploadFile(
          _selectedFile!,
          storagePath,
        );

        // --- STEP 2: SAVE TASK WITH URL TO FIRESTORE ---
        final newTask = TaskModel(
          id: '',
          requesterId: user?.uid ?? 'demo-user',
          title: _itemController.text,
          pickup: _selectedPickup!,
          drop: _selectedDrop!,
          price: _priceController.text,
          status: 'OPEN',
          createdAt: DateTime.now(),
          campusId: _selectedCampusId ?? 'unknown',
          campusName: _selectedCampusName ?? 'Unknown Campus',
          transportMode: _selectedTransportMode ?? 'Walking',
          fileUrl: fileUrl, // PASS THE NEW URL
        );

        await ref.read(taskRepositoryProvider).addTask(newTask);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Task Posted Successfully! File Uploaded!"),
            ),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Upload Error: ${e.toString()}"),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) setState(() => _isUploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final campusesAsync = ref.watch(campusesStreamProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Request a Runner"),
        leading: IconButton(
          icon: Icon(PhosphorIcons.x()),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const MyTasksScreen(),
                ),
              );
            },
            icon: Icon(PhosphorIcons.listChecks()),
            tooltip: 'My Tasks',
          ),
          IconButton(
            onPressed: _toggleListening,
            icon: Icon(
              _isListening ? Icons.mic_off : Icons.mic,
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isListening ? Icons.hearing : Icons.mic_none,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isListening
                                ? 'Listening...'
                                : 'Voice commands available',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _lastTranscript.isEmpty
                                ? 'Say: pickup Admin Block, drop Girls Hostel C, item print notes, price 40'
                                : _lastTranscript,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _toggleListening,
                      icon: Icon(_isListening ? Icons.stop : Icons.mic),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              _buildSectionTitle("Select Campus"),
              const SizedBox(height: 12),
              campusesAsync.when(
                data: (campuses) {
                  if (campuses.isEmpty) {
                    return const Text("No campuses available.");
                  }

                  _selectedCampusId ??= campuses.first.id;
                  _selectedCampusName ??= campuses.first.name;

                  return DropdownButtonFormField<String>(
                    initialValue: _selectedCampusId,
                    decoration: _inputDecoration(
                      "Campus",
                      PhosphorIcons.buildings(),
                    ),
                    items: campuses.map((campus) {
                      return DropdownMenuItem(
                        value: campus.id,
                        child: Text(campus.name),
                      );
                    }).toList(),
                    onChanged: (val) {
                      final selected = campuses.firstWhere(
                        (campus) => campus.id == val,
                        orElse: () => campuses.first,
                      );
                      setState(() {
                        _selectedCampusId = selected.id;
                        _selectedCampusName = selected.name;
                      });
                    },
                    validator: (val) =>
                        AppValidators.validateRequired(val, "Campus"),
                  );
                },
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (error, _) => Text("Error: $error"),
              ),

              const SizedBox(height: 24),
              // --- LOCATION DROPDOWNS ---
              _buildSectionTitle("Where to go?"),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                initialValue: _selectedPickup,
                decoration: _inputDecoration(
                  "Pickup Location",
                  PhosphorIcons.storefront(),
                ),
                items: AppConstants.pickupZones.map((zone) {
                  return DropdownMenuItem(value: zone, child: Text(zone));
                }).toList(),
                onChanged: (val) => setState(() => _selectedPickup = val),
                validator: (val) =>
                    AppValidators.validateRequired(val, "Pickup"),
              ),

              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedDrop,
                decoration: _inputDecoration(
                  "Drop Location",
                  PhosphorIcons.mapPin(),
                ),
                items: AppConstants.dropZones.map((zone) {
                  return DropdownMenuItem(value: zone, child: Text(zone));
                }).toList(),
                onChanged: (val) => setState(() => _selectedDrop = val),
                validator: (val) =>
                    AppValidators.validateRequired(val, "Drop location"),
              ),

              // --- END LOCATION DROPDOWNS ---
              const SizedBox(height: 24),
              _buildSectionTitle("Transport Mode"),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedTransportMode,
                decoration: _inputDecoration(
                  "Select mode",
                  PhosphorIcons.personSimpleWalk(),
                ),
                items: AppConstants.transportModes.map((mode) {
                  return DropdownMenuItem(value: mode, child: Text(mode));
                }).toList(),
                onChanged: (val) => setState(() => _selectedTransportMode = val),
                validator: (val) =>
                    AppValidators.validateRequired(val, "Transport mode"),
              ),

              const SizedBox(height: 24),
              _buildSectionTitle("What do you need?"),
              const SizedBox(height: 12),

              // ITEM NAME
              TextFormField(
                controller: _itemController,
                decoration: _inputDecoration(
                  "e.g. Printing a 10-page doc",
                  PhosphorIcons.shoppingBag(),
                ),
                validator: (val) =>
                    AppValidators.validateRequired(val, "Item name"),
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: BorderSide(
                    color: _selectedFile != null ? Colors.green : Colors.grey,
                  ),
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
                decoration: _inputDecoration(
                  "₹20",
                  PhosphorIcons.currencyInr(),
                ),
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
