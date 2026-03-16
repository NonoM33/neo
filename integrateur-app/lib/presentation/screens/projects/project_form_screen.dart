import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/validators.dart';
import '../../../domain/entities/client.dart';
import '../../../domain/entities/project.dart';
import '../../blocs/projects/projects_event.dart';

/// Project creation/edit form screen
class ProjectFormScreen extends ConsumerStatefulWidget {
  final String? projectId;

  const ProjectFormScreen({
    super.key,
    this.projectId,
  });

  bool get isEditing => projectId != null;

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _uuid = const Uuid();

  // Client fields
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _cityController = TextEditingController();

  // Project fields
  HousingType _housingType = HousingType.maison;
  final _surfaceController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime? _appointmentDate;

  bool _isLoading = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _postalCodeController.dispose();
    _cityController.dispose();
    _surfaceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Modifier le projet' : 'Nouveau projet'),
        actions: [
          FilledButton(
            onPressed: _isLoading ? null : _submit,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Enregistrer'),
          ),
          AppSpacing.hGapMd,
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Client section
                _buildSectionTitle(context, 'Client'),
                AppSpacing.vGapMd,
                _buildClientFields(context),
                AppSpacing.vGapXl,

                // Address section
                _buildSectionTitle(context, 'Adresse'),
                AppSpacing.vGapMd,
                _buildAddressFields(context),
                AppSpacing.vGapXl,

                // Project section
                _buildSectionTitle(context, 'Projet'),
                AppSpacing.vGapMd,
                _buildProjectFields(context),
                AppSpacing.vGapXl,

                // Notes section
                _buildSectionTitle(context, 'Notes'),
                AppSpacing.vGapMd,
                TextFormField(
                  controller: _notesController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Notes supplémentaires...',
                  ),
                ),
                AppSpacing.vGapXl,
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge,
    );
  }

  Widget _buildClientFields(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _firstNameController,
                decoration: const InputDecoration(
                  labelText: 'Prénom',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) => Validators.required(v, fieldName: 'Prénom'),
                textInputAction: TextInputAction.next,
              ),
            ),
            AppSpacing.hGapMd,
            Expanded(
              child: TextFormField(
                controller: _lastNameController,
                decoration: const InputDecoration(
                  labelText: 'Nom',
                ),
                validator: (v) => Validators.required(v, fieldName: 'Nom'),
                textInputAction: TextInputAction.next,
              ),
            ),
          ],
        ),
        AppSpacing.vGapMd,
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: Validators.email,
                textInputAction: TextInputAction.next,
              ),
            ),
            AppSpacing.hGapMd,
            Expanded(
              child: TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Téléphone',
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
                validator: Validators.phone,
                textInputAction: TextInputAction.next,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAddressFields(BuildContext context) {
    return Column(
      children: [
        TextFormField(
          controller: _streetController,
          decoration: const InputDecoration(
            labelText: 'Rue',
            prefixIcon: Icon(Icons.location_on),
          ),
          validator: (v) => Validators.required(v, fieldName: 'Rue'),
          textInputAction: TextInputAction.next,
        ),
        AppSpacing.vGapMd,
        Row(
          children: [
            SizedBox(
              width: 150,
              child: TextFormField(
                controller: _postalCodeController,
                decoration: const InputDecoration(
                  labelText: 'Code postal',
                ),
                keyboardType: TextInputType.number,
                validator: Validators.postalCode,
                textInputAction: TextInputAction.next,
              ),
            ),
            AppSpacing.hGapMd,
            Expanded(
              child: TextFormField(
                controller: _cityController,
                decoration: const InputDecoration(
                  labelText: 'Ville',
                ),
                validator: (v) => Validators.required(v, fieldName: 'Ville'),
                textInputAction: TextInputAction.next,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildProjectFields(BuildContext context) {
    return Column(
      children: [
        // Housing type
        DropdownButtonFormField<HousingType>(
          value: _housingType,
          decoration: const InputDecoration(
            labelText: 'Type de logement',
            prefixIcon: Icon(Icons.home),
          ),
          items: HousingType.values.map((type) {
            return DropdownMenuItem(
              value: type,
              child: Text(type.displayName),
            );
          }).toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() => _housingType = value);
            }
          },
        ),
        AppSpacing.vGapMd,

        Row(
          children: [
            // Surface
            Expanded(
              child: TextFormField(
                controller: _surfaceController,
                decoration: const InputDecoration(
                  labelText: 'Surface (m²)',
                  prefixIcon: Icon(Icons.square_foot),
                ),
                keyboardType: TextInputType.number,
                validator: (v) => Validators.positiveNumber(v, fieldName: 'Surface'),
              ),
            ),
            AppSpacing.hGapMd,

            // Appointment date
            Expanded(
              child: InkWell(
                onTap: _selectDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Date de RDV',
                    prefixIcon: Icon(Icons.calendar_today),
                  ),
                  child: Text(
                    _appointmentDate != null
                        ? '${_appointmentDate!.day}/${_appointmentDate!.month}/${_appointmentDate!.year}'
                        : 'Sélectionner',
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _appointmentDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.now(),
      );

      setState(() {
        _appointmentDate = DateTime(
          date.year,
          date.month,
          date.day,
          time?.hour ?? 9,
          time?.minute ?? 0,
        );
      });
    }
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);

    final project = Project(
      id: widget.projectId ?? _uuid.v4(),
      client: Client(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        address: Address(
          street: _streetController.text.trim(),
          postalCode: _postalCodeController.text.trim(),
          city: _cityController.text.trim(),
        ),
      ),
      housingType: _housingType,
      surfaceM2: _surfaceController.text.isNotEmpty
          ? double.tryParse(_surfaceController.text)
          : null,
      status: ProjectStatus.audit,
      createdAt: DateTime.now(),
      appointmentDate: _appointmentDate,
      integrateurId: '', // Will be set from current user
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
    );

    final bloc = ref.read(projectsBlocProvider);

    if (widget.isEditing) {
      bloc.add(ProjectUpdateRequested(project));
    } else {
      bloc.add(ProjectCreateRequested(project));
    }

    // Navigate back
    Navigator.of(context).pop();
  }
}
