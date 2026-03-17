import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/validators.dart';
import '../../../domain/entities/client.dart';
import '../../../domain/entities/project.dart';
import '../../blocs/projects/projects_event.dart';

/// Project creation/edit form screen - tablet optimized 2-column layout
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
  final _scrollController = ScrollController();
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
  final _nameController = TextEditingController();
  final _surfaceController = TextEditingController();
  final _notesController = TextEditingController();

  bool _isLoading = false;
  bool _hasUnsavedChanges = false;

  @override
  void initState() {
    super.initState();
    // Track changes for unsaved warning
    for (final controller in [
      _firstNameController, _lastNameController, _emailController,
      _phoneController, _streetController, _postalCodeController,
      _cityController, _nameController, _surfaceController, _notesController,
    ]) {
      controller.addListener(_onFieldChanged);
    }
  }

  void _onFieldChanged() {
    if (!_hasUnsavedChanges) {
      setState(() => _hasUnsavedChanges = true);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _postalCodeController.dispose();
    _cityController.dispose();
    _nameController.dispose();
    _surfaceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<bool> _onWillPop() async {
    if (!_hasUnsavedChanges) return true;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Modifications non sauvegardees'),
        content: const Text('Voulez-vous quitter sans enregistrer ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Continuer l\'edition'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Quitter'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return PopScope(
      canPop: !_hasUnsavedChanges,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
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
          child: isWide
              ? _buildTabletLayout(context)
              : _buildMobileLayout(context),
        ),
      ),
    );
  }

  /// Tablet: 2-column layout - client left, project right
  Widget _buildTabletLayout(BuildContext context) {
    return SingleChildScrollView(
      controller: _scrollController,
      padding: AppSpacing.pagePadding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left column: Client info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionTitle(context, 'Client'),
                AppSpacing.vGapMd,
                _buildClientFields(context),
                AppSpacing.vGapXl,
                _buildSectionTitle(context, 'Adresse'),
                AppSpacing.vGapMd,
                _buildAddressFields(context),
              ],
            ),
          ),
          AppSpacing.hGapXl,
          // Right column: Project info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionTitle(context, 'Projet'),
                AppSpacing.vGapMd,
                _buildProjectFields(context),
                AppSpacing.vGapXl,
                _buildSectionTitle(context, 'Notes'),
                AppSpacing.vGapMd,
                TextFormField(
                  controller: _notesController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Notes supplementaires...',
                  ),
                ),
                AppSpacing.vGapXl,
                // Submit button at bottom of form
                Container(
                  padding: const EdgeInsets.only(top: 24),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: Theme.of(context).colorScheme.outlineVariant.withAlpha(40),
                      ),
                    ),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _isLoading ? null : _submit,
                      icon: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save_rounded),
                      label: const Text('Enregistrer le projet'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Mobile: single column
  Widget _buildMobileLayout(BuildContext context) {
    return SingleChildScrollView(
      controller: _scrollController,
      padding: AppSpacing.pagePadding,
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
              hintText: 'Notes supplementaires...',
            ),
          ),
          AppSpacing.vGapXl,

          // Submit button at bottom
          Container(
            padding: const EdgeInsets.only(top: 24),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: Theme.of(context).colorScheme.outlineVariant.withAlpha(40),
                ),
              ),
            ),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isLoading ? null : _submit,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_rounded),
                label: const Text('Enregistrer le projet'),
              ),
            ),
          ),
          AppSpacing.vGapXl,
        ],
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
                  labelText: 'Prenom',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) => Validators.required(v, fieldName: 'Prenom'),
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
                  labelText: 'Telephone',
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
              width: 160,
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
        // Project name
        TextFormField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: 'Nom du projet',
            prefixIcon: Icon(Icons.home),
          ),
          validator: (v) => Validators.required(v, fieldName: 'Nom du projet'),
          textInputAction: TextInputAction.next,
        ),
        AppSpacing.vGapMd,

        // Surface
        TextFormField(
          controller: _surfaceController,
          decoration: const InputDecoration(
            labelText: 'Surface (m\u00B2)',
            prefixIcon: Icon(Icons.square_foot),
          ),
          keyboardType: TextInputType.number,
          validator: (v) => Validators.positiveNumber(v, fieldName: 'Surface'),
          textInputAction: TextInputAction.done,
        ),
      ],
    );
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    final clientId = _uuid.v4();
    final project = Project(
      id: widget.projectId ?? _uuid.v4(),
      name: _nameController.text.trim(),
      clientId: clientId,
      client: Client(
        id: clientId,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        email: _emailController.text.trim().isNotEmpty
            ? _emailController.text.trim()
            : null,
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
        address: _streetController.text.trim().isNotEmpty
            ? _streetController.text.trim()
            : null,
        postalCode: _postalCodeController.text.trim().isNotEmpty
            ? _postalCodeController.text.trim()
            : null,
        city: _cityController.text.trim().isNotEmpty
            ? _cityController.text.trim()
            : null,
      ),
      status: ProjectStatus.brouillon,
      address: _streetController.text.trim().isNotEmpty
          ? _streetController.text.trim()
          : null,
      city: _cityController.text.trim().isNotEmpty
          ? _cityController.text.trim()
          : null,
      postalCode: _postalCodeController.text.trim().isNotEmpty
          ? _postalCodeController.text.trim()
          : null,
      surface: _surfaceController.text.isNotEmpty
          ? double.tryParse(_surfaceController.text)
          : null,
      description: _notesController.text.isNotEmpty
          ? _notesController.text
          : null,
      createdAt: DateTime.now(),
    );

    final bloc = ref.read(projectsBlocProvider);

    if (widget.isEditing) {
      bloc.add(ProjectUpdateRequested(project));
    } else {
      bloc.add(ProjectCreateRequested(project));
    }

    _hasUnsavedChanges = false;
    Navigator.of(context).pop();
  }
}
