<<<<<<< HEAD
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:file_picker/file_picker.dart';
import 'package:uuid/uuid.dart'; // <<<--- MISSING IMPORT ADDED HERE
import 'package:speech_to_text/speech_to_text.dart' as stt;

// Project Imports
import '../../../core/config/app_mode.dart';
import '../../../core/constants/app_constants.dart';
import '../../widgets/inputs/primary_button.dart';
import '../../../core/utils/validators.dart';
=======
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

// Project Imports
>>>>>>> b96398b (local changes)
import '../../../data/models/task_model.dart';
import '../../../logic/auth_provider.dart';
import '../../../logic/campus_provider.dart';
import '../../../logic/task_provider.dart';
import '../../../logic/storage_provider.dart';
<<<<<<< HEAD
import '../auth/login_screen.dart';
import '../tracking/my_tasks_screen.dart';
=======
import '../../../logic/auth_provider.dart';
import '../../widgets/fields/custom_text_field.dart';
>>>>>>> b96398b (local changes)

class RequesterHomeScreen extends ConsumerStatefulWidget {
  const RequesterHomeScreen({super.key});

  @override
  ConsumerState<RequesterHomeScreen> createState() =>
      _RequesterHomeScreenState();
}

class _RequesterHomeScreenState extends ConsumerState<RequesterHomeScreen> {
  final _formKey = GlobalKey<FormState>();
<<<<<<< HEAD

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
=======
>>>>>>> b96398b (local changes)

  final _titleController = TextEditingController();
  final _pickupController = TextEditingController();
  final _dropController = TextEditingController();
  final _priceController = TextEditingController();

  bool _isLoading = false;

  File? _selectedFile; 
  String? _fileUploadError;

  @override
  void dispose() {
    _titleController.dispose();
    _pickupController.dispose();
    _dropController.dispose();
    _priceController.dispose();
    super.dispose();
  }

<<<<<<< HEAD
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

    final priceMatch = RegExp(
      r'(price|tip|amount)\s+(\d+)',
    ).firstMatch(normalized);
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
=======
  // Pick File
>>>>>>> b96398b (local changes)
  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx'],
    );

<<<<<<< HEAD
    if (result != null) {
      // NOTE: We need the 'dart:io' import for the File object
      final file = File(result.files.single.path!);
=======
    if (result != null && result.files.single.path != null) {
>>>>>>> b96398b (local changes)
      setState(() {
        _selectedFile = File(result.files.single.path!);
      });
    }
  }

<<<<<<< HEAD
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
=======
  // POST TASK
  Future<void> _postTask() async {
    final authRepo = ref.read(authRepositoryProvider);
    final currentUser = authRepo.getCurrentUser();

    if (currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please sign in to post a task.")),
      );
      return;
    }
>>>>>>> b96398b (local changes)

    if (!_formKey.currentState!.validate()) return;

    final price = double.tryParse(_priceController.text);
    if (price == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Invalid price entered.")),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _fileUploadError = null;
    });

    String? uploadedUrl;

    try {
      // FILE UPLOAD OPTIONAL
      if (_selectedFile != null) {
        final storageRepo = ref.read(storageRepositoryProvider);
<<<<<<< HEAD
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
=======
        uploadedUrl = await storageRepo.uploadFile(
          _selectedFile!,
          "tasks",
          currentUser.uid,
>>>>>>> b96398b (local changes)
        );
      }

      // Create Task
      final newTask = TaskModel(
        id: "",
        title: _titleController.text.trim(),
        pickup: _pickupController.text.trim(),
        drop: _dropController.text.trim(),
        price: price,
        status: "OPEN",
        requesterId: currentUser.uid,
        runnerId: null,
        fileUrl: uploadedUrl,
        createdAt: DateTime.now(),
        acceptedAt: null,
        completedAt: null,
      );

<<<<<<< HEAD
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
=======
      await ref.read(taskRepositoryProvider).createTask(newTask);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Task Posted Successfully!")),
      );

      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;

      String error = "Error: Could not post task.";

      if (_selectedFile != null &&
          (e.toString().contains("object-not-found") ||
              e.toString().contains("Permission"))) {
        error = "Upload Failed: Fix Firebase Storage Rules.";
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: Colors.red),
      );

      setState(() => _fileUploadError = error);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
>>>>>>> b96398b (local changes)
      }
    }
  }

  // UI
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final campusesAsync = ref.watch(campusesStreamProvider);

    return Scaffold(
<<<<<<< HEAD
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: const Text("Request a Runner"),
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(PhosphorIcons.x()),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const MyTasksScreen()),
              );
            },
            icon: Icon(PhosphorIcons.listChecks()),
            tooltip: 'My Tasks',
=======
      appBar: AppBar(title: const Text("Post a New Task"), elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("What do you need?",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              // Title
              CustomTextField(
                controller: _titleController,
                labelText: "Task Title",
                icon: Icon(PhosphorIcons.list()),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter title" : null,
              ),
              const SizedBox(height: 24),

              const Text("Where & How Much?",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              // Pickup
              CustomTextField(
                controller: _pickupController,
                labelText: "Pickup Location",
                icon: Icon(PhosphorIcons.mapPin()),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter pickup point" : null,
              ),
              const SizedBox(height: 16),

              // Drop
              CustomTextField(
                controller: _dropController,
                labelText: "Drop Location",
                icon: Icon(PhosphorIcons.truck()),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter drop point" : null,
              ),
              const SizedBox(height: 16),

              // Price
              CustomTextField(
                controller: _priceController,
                labelText: "Price (₹)",
                icon: Icon(PhosphorIcons.currencyInr()),
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return "Enter price";
                  if (double.tryParse(v) == null) return "Invalid number";
                  return null;
                },
              ),
              const SizedBox(height: 32),

              // FILE UPLOAD
              const Text("Print File (Optional)",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              GestureDetector(
                onTap: _pickFile,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color:
                        Theme.of(context).colorScheme.primary.withOpacity(0.05),
                    border: Border.all(
                      color: _selectedFile != null
                          ? Theme.of(context).colorScheme.secondary
                          : Colors.grey.shade400,
                      width: 1.3,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _selectedFile != null
                            ? PhosphorIcons.checkCircle()
                            : PhosphorIcons.uploadSimple(),
                        color: _selectedFile != null
                            ? Theme.of(context).colorScheme.secondary
                            : Colors.grey,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _selectedFile != null
                              ? "Selected: ${_selectedFile!.path.split('/').last}"
                              : "Upload PDF/DOC (Optional)",
                          style: TextStyle(
                            fontWeight: _selectedFile != null
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                      ),
                      if (_selectedFile != null)
                        IconButton(
                          icon: Icon(PhosphorIcons.x()),
                          onPressed: () =>
                              setState(() => _selectedFile = null),
                        )
                    ],
                  ),
                ),
              ),

              if (_fileUploadError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(_fileUploadError!,
                      style: const TextStyle(color: Colors.red)),
                ),

              const SizedBox(height: 32),

              // POST BUTTON
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _postTask,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child:
                              CircularProgressIndicator(color: Colors.white))
                      : Icon(PhosphorIcons.paperPlaneRight(), size: 18),
                  label:
                      Text(_isLoading ? "Posting..." : "Post Task"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),
            ],
>>>>>>> b96398b (local changes)
          ),
          IconButton(
            onPressed: _toggleListening,
            icon: Icon(_isListening ? Icons.mic_off : Icons.mic),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    colors.primaryContainer.withValues(alpha: 0.24),
                    colors.secondaryContainer.withValues(alpha: 0.18),
                    colors.tertiaryContainer.withValues(alpha: 0.16),
                    colors.surface,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: -70,
            right: -40,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colors.primary.withValues(alpha: 0.1),
              ),
            ),
          ),
          Positioned(
            left: -60,
            bottom: 120,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colors.tertiary.withValues(alpha: 0.08),
              ),
            ),
          ),
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeroCard(context)
                      .animate()
                      .fade(duration: 320.ms)
                      .slideY(begin: 0.08, end: 0),
                  const SizedBox(height: 18),
                  _buildFormSection(
                    context,
                    title: 'Campus & route',
                    subtitle:
                        'Pick the campus and where the runner needs to go.',
                    icon: PhosphorIcons.mapTrifold(),
                    child: Column(
                      children: [
                        campusesAsync.when(
                          data: (campuses) {
                            if (campuses.isEmpty) {
                              return const Text('No campuses available.');
                            }

                            _selectedCampusId ??= campuses.first.id;
                            _selectedCampusName ??= campuses.first.name;

                            return DropdownButtonFormField<String>(
                              initialValue: _selectedCampusId,
                              decoration: _inputDecoration(
                                'Campus',
                                PhosphorIcons.buildings(),
                              ),
                              borderRadius: BorderRadius.circular(18),
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
                                  AppValidators.validateRequired(val, 'Campus'),
                            );
                          },
                          loading: () => const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          error: (error, _) => Text('Error: $error'),
                        ),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedPickup,
                          decoration: _inputDecoration(
                            'Pickup location',
                            PhosphorIcons.storefront(),
                          ),
                          borderRadius: BorderRadius.circular(18),
                          items: AppConstants.pickupZones.map((zone) {
                            return DropdownMenuItem(
                              value: zone,
                              child: Text(zone),
                            );
                          }).toList(),
                          onChanged: (val) =>
                              setState(() => _selectedPickup = val),
                          validator: (val) =>
                              AppValidators.validateRequired(val, 'Pickup'),
                        ),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedDrop,
                          decoration: _inputDecoration(
                            'Drop location',
                            PhosphorIcons.mapPin(),
                          ),
                          borderRadius: BorderRadius.circular(18),
                          items: AppConstants.dropZones.map((zone) {
                            return DropdownMenuItem(
                              value: zone,
                              child: Text(zone),
                            );
                          }).toList(),
                          onChanged: (val) =>
                              setState(() => _selectedDrop = val),
                          validator: (val) => AppValidators.validateRequired(
                            val,
                            'Drop location',
                          ),
                        ),
                      ],
                    ),
                  ).animate().fade(delay: 80.ms).slideY(begin: 0.06, end: 0),
                  const SizedBox(height: 16),
                  _buildFormSection(
                    context,
                    title: 'Task details',
                    subtitle:
                        'Describe the work clearly so runners can accept faster.',
                    icon: PhosphorIcons.notePencil(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextFormField(
                          controller: _itemController,
                          maxLines: 2,
                          decoration: _inputDecoration(
                            'e.g. Print my assignment notes and deliver to hostel',
                            PhosphorIcons.shoppingBag(),
                          ),
                          validator: (val) =>
                              AppValidators.validateRequired(val, 'Item name'),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Transport mode',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: AppConstants.transportModes.map((mode) {
                            final selected = _selectedTransportMode == mode;
                            return ChoiceChip(
                              label: Text(mode),
                              selected: selected,
                              avatar: Icon(
                                _transportIcon(mode),
                                size: 18,
                                color: selected
                                    ? colors.onPrimaryContainer
                                    : colors.onSurfaceVariant,
                              ),
                              onSelected: (_) {
                                setState(() => _selectedTransportMode = mode);
                              },
                              selectedColor: colors.primaryContainer,
                              backgroundColor: colors.surfaceContainerHighest
                                  .withValues(alpha: 0.55),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              side: BorderSide(
                                color: selected
                                    ? colors.primary.withValues(alpha: 0.35)
                                    : colors.outlineVariant.withValues(
                                        alpha: 0.25,
                                      ),
                              ),
                            );
                          }).toList(),
                        ),
                        if (_selectedTransportMode == null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              'Choose a transport mode to continue.',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colors.error,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ).animate().fade(delay: 140.ms).slideY(begin: 0.06, end: 0),
                  const SizedBox(height: 16),
                  _buildFormSection(
                    context,
                    title: 'Document & fee',
                    subtitle: 'Attach the file and set a fair runner tip.',
                    icon: PhosphorIcons.fileArrowUp(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(20),
                          onTap: _pickFile,
                          child: Ink(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  colors.primaryContainer.withValues(
                                    alpha: 0.38,
                                  ),
                                  colors.secondaryContainer.withValues(
                                    alpha: 0.24,
                                  ),
                                ],
                              ),
                              border: Border.all(
                                color: _selectedFile != null
                                    ? colors.primary.withValues(alpha: 0.4)
                                    : colors.outlineVariant.withValues(
                                        alpha: 0.28,
                                      ),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(16),
                                    color: colors.surface.withValues(
                                      alpha: 0.72,
                                    ),
                                  ),
                                  child: Icon(
                                    PhosphorIcons.filePdf(),
                                    color: _selectedFile != null
                                        ? colors.primary
                                        : colors.onSurfaceVariant,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _fileName ?? 'Select PDF document',
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _selectedFile != null
                                            ? 'File attached and ready to upload'
                                            : 'Upload the file runners need for this task',
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                              color: colors.onSurfaceVariant,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  _selectedFile != null
                                      ? PhosphorIcons.checkCircle()
                                      : PhosphorIcons.uploadSimple(),
                                  color: _selectedFile != null
                                      ? colors.primary
                                      : colors.onSurfaceVariant,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _priceController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration(
                            '₹20',
                            PhosphorIcons.currencyInr(),
                          ),
                          validator: AppValidators.validatePrice,
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: ['20', '40', '60'].map((price) {
                            final selected = _priceController.text == price;
                            return ChoiceChip(
                              label: Text('₹$price'),
                              selected: selected,
                              onSelected: (_) {
                                setState(() => _priceController.text = price);
                              },
                              selectedColor: colors.tertiaryContainer,
                              backgroundColor: colors.surfaceContainerHighest
                                  .withValues(alpha: 0.55),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              side: BorderSide(
                                color: selected
                                    ? colors.tertiary.withValues(alpha: 0.35)
                                    : colors.outlineVariant.withValues(
                                        alpha: 0.25,
                                      ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Suggested: ₹20 for nearby runs, ₹40+ for longer hostel routes.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fade(delay: 200.ms).slideY(begin: 0.06, end: 0),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      color: colors.surface.withValues(alpha: 0.8),
                      border: Border.all(
                        color: colors.outlineVariant.withValues(alpha: 0.28),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: colors.shadow.withValues(alpha: 0.06),
                          blurRadius: 24,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                color: colors.primaryContainer.withValues(
                                  alpha: 0.7,
                                ),
                              ),
                              child: Icon(
                                PhosphorIcons.paperPlaneTilt(),
                                color: colors.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Ready to send',
                                    style: theme.textTheme.titleSmall?.copyWith(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Post the task and notify runners nearby.',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: colors.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(18),
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [colors.primary, colors.secondary],
                            ),
                          ),
                          child: PrimaryButton(
                            text: 'Post Task',
                            isLoading: _isUploading,
                            onPressed: _postTask,
                            color: Colors.transparent,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fade(delay: 260.ms).slideY(begin: 0.06, end: 0),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
<<<<<<< HEAD

  // --- HELPER FUNCTIONS ---
  InputDecoration _inputDecoration(String hint, IconData icon) {
    final colors = Theme.of(context).colorScheme;

    return InputDecoration(
      prefixIcon: Icon(icon),
      hintText: hint,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(
          color: colors.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(color: colors.primary, width: 1.4),
      ),
      filled: true,
      fillColor: colors.surface.withValues(alpha: 0.78),
    );
  }

  Widget _buildHeroCard(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primaryContainer.withValues(alpha: 0.8),
            colors.secondaryContainer.withValues(alpha: 0.6),
            colors.tertiaryContainer.withValues(alpha: 0.58),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  color: colors.surface.withValues(alpha: 0.75),
                ),
                child: Icon(
                  PhosphorIcons.paperPlaneTilt(),
                  color: colors.primary,
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Create a task that gets accepted fast',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Clear route, fair tip, attached document. Keep it simple and sharp.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: colors.surface.withValues(alpha: 0.64),
            ),
            child: Row(
              children: [
                Icon(
                  _isListening ? Icons.hearing : Icons.mic_none,
                  color: colors.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isListening ? 'Listening now...' : 'Voice quick-fill',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _lastTranscript.isEmpty
                            ? 'Say: pickup Admin Block, drop Girls Hostel C, item print notes, price 40'
                            : _lastTranscript,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                FilledButton.tonalIcon(
                  onPressed: _toggleListening,
                  icon: Icon(_isListening ? Icons.stop : Icons.mic),
                  label: Text(_isListening ? 'Stop' : 'Speak'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormSection(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Widget child,
  }) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: colors.surface.withValues(alpha: 0.8),
        border: Border.all(
          color: colors.outlineVariant.withValues(alpha: 0.28),
        ),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: colors.primaryContainer.withValues(alpha: 0.7),
                ),
                child: Icon(icon, color: colors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  IconData _transportIcon(String mode) {
    switch (mode.toLowerCase()) {
      case 'walking':
        return PhosphorIcons.personSimpleWalk();
      case 'cycling':
        return PhosphorIcons.bicycle();
      case 'vehicle':
        return PhosphorIcons.car();
      default:
        return PhosphorIcons.navigationArrow();
    }
  }
=======
>>>>>>> b96398b (local changes)
}
