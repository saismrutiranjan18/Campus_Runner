import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/models/shop_model.dart';
import '../../../logic/campus_provider.dart';
import '../../../logic/shop_provider.dart';

class RegisterShopScreen extends ConsumerStatefulWidget {
  const RegisterShopScreen({super.key});

  @override
  ConsumerState<RegisterShopScreen> createState() => _RegisterShopScreenState();
}

class _RegisterShopScreenState extends ConsumerState<RegisterShopScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _categoryController = TextEditingController();
  final _phoneController = TextEditingController();
  final _locationController = TextEditingController();

  String? _selectedCampusId;
  String? _selectedCampusName;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _categoryController.dispose();
    _phoneController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final repo = ref.read(shopRepositoryProvider);
    final userId = repo.currentUserId();
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in before registering a shop.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final shop = ShopModel(
        id: '',
        campusId: _selectedCampusId ?? 'unknown',
        campusName: _selectedCampusName ?? 'Unknown Campus',
        name: _nameController.text.trim(),
        category: _categoryController.text.trim(),
        contactPhone: _phoneController.text.trim(),
        location: _locationController.text.trim(),
        createdBy: userId,
        createdAt: DateTime.now(),
      );

      await repo.addShop(shop);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Shop registered successfully.')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to register shop: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final campusesAsync = ref.watch(campusesStreamProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Register Shop')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
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
                    decoration: const InputDecoration(labelText: 'Campus'),
                    items: campuses.map((campus) {
                      return DropdownMenuItem(
                        value: campus.id,
                        child: Text(campus.name),
                      );
                    }).toList(),
                    onChanged: (value) {
                      final selected = campuses.firstWhere(
                        (campus) => campus.id == value,
                        orElse: () => campuses.first,
                      );
                      setState(() {
                        _selectedCampusId = selected.id;
                        _selectedCampusName = selected.name;
                      });
                    },
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
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Shop name'),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _categoryController,
                decoration: const InputDecoration(labelText: 'Category'),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Contact phone'),
                keyboardType: TextInputType.phone,
                validator: (value) =>
                    value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Location / block',
                ),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _submit,
                  child: Text(_isSaving ? 'Saving...' : 'Register Shop'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
