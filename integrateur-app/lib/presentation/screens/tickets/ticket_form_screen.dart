import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/ticket.dart';
import '../../blocs/tickets/tickets_bloc.dart';
import '../../blocs/tickets/tickets_event.dart';
import '../../blocs/tickets/tickets_state.dart';

class TicketFormScreen extends ConsumerStatefulWidget {
  const TicketFormScreen({super.key});

  @override
  ConsumerState<TicketFormScreen> createState() => _TicketFormScreenState();
}

class _TicketFormScreenState extends ConsumerState<TicketFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _clientIdController = TextEditingController();

  TicketPriority _priority = TicketPriority.normale;
  TicketSource _source = TicketSource.backoffice;
  String? _categoryId;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _clientIdController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    HapticFeedback.lightImpact();
    setState(() => _isSubmitting = true);

    ref.read(ticketsBlocProvider).add(TicketCreateRequested(
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim(),
      clientId: _clientIdController.text.trim(),
      priority: _priority,
      source: _source,
      categoryId: _categoryId,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bloc = ref.watch(ticketsBlocProvider);

    return PopScope(
      canPop: _titleController.text.isEmpty && _descriptionController.text.isEmpty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldPop = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Abandonner les modifications ?'),
            content: const Text('Les données saisies seront perdues.'),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
              FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Abandonner')),
            ],
          ),
        );
        if (shouldPop == true && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: BlocListener<TicketsBloc, TicketsState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is TicketOperationSuccess) {
            context.showSuccessSnackBar(state.message);
            Navigator.of(context).pop();
          } else if (state is TicketsError) {
            setState(() => _isSubmitting = false);
            context.showErrorSnackBar(state.message);
          }
        },
        child: Scaffold(
          backgroundColor: cs.surface,
          appBar: AppBar(
            title: const Text('Nouveau ticket'),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Créer'),
                ),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: AppSpacing.formPadding,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 700),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Titre *',
                          hintText: 'Ex: Problème de connexion thermostat',
                        ),
                        textInputAction: TextInputAction.next,
                        validator: (v) => v == null || v.trim().isEmpty ? 'Le titre est requis' : null,
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Description
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Description *',
                          hintText: 'Décrivez le problème en détail...',
                          alignLabelWithHint: true,
                        ),
                        maxLines: 5,
                        textInputAction: TextInputAction.next,
                        validator: (v) => v == null || v.trim().isEmpty ? 'La description est requise' : null,
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Client ID
                      TextFormField(
                        controller: _clientIdController,
                        decoration: const InputDecoration(
                          labelText: 'ID Client *',
                          hintText: 'UUID du client',
                          prefixIcon: Icon(Icons.person_outline_rounded),
                        ),
                        textInputAction: TextInputAction.next,
                        validator: (v) => v == null || v.trim().isEmpty ? 'Le client est requis' : null,
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Priority & Source in a row
                      LayoutBuilder(
                        builder: (context, constraints) {
                          if (constraints.maxWidth >= 500) {
                            return Row(
                              children: [
                                Expanded(child: _buildPriorityDropdown(context)),
                                const SizedBox(width: AppSpacing.formFieldSpacing),
                                Expanded(child: _buildSourceDropdown(context)),
                              ],
                            );
                          }
                          return Column(
                            children: [
                              _buildPriorityDropdown(context),
                              const SizedBox(height: AppSpacing.formFieldSpacing),
                              _buildSourceDropdown(context),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Category dropdown
                      _buildCategoryDropdown(context),

                      const SizedBox(height: 40),

                      // Submit button
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _isSubmitting ? null : _submit,
                          icon: _isSubmitting ? null : const Icon(Icons.check_rounded),
                          label: _isSubmitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Créer le ticket'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPriorityDropdown(BuildContext context) {
    return DropdownButtonFormField<TicketPriority>(
      initialValue: _priority,
      decoration: const InputDecoration(
        labelText: 'Priorité',
        prefixIcon: Icon(Icons.flag_outlined),
      ),
      items: TicketPriority.values.map((priority) {
        return DropdownMenuItem(
          value: priority,
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _getPriorityColor(priority),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(priority.displayName),
            ],
          ),
        );
      }).toList(),
      onChanged: (value) {
        if (value != null) setState(() => _priority = value);
      },
    );
  }

  Widget _buildSourceDropdown(BuildContext context) {
    return DropdownButtonFormField<TicketSource>(
      initialValue: _source,
      decoration: const InputDecoration(
        labelText: 'Source',
        prefixIcon: Icon(Icons.source_outlined),
      ),
      items: TicketSource.values.map((source) {
        return DropdownMenuItem(
          value: source,
          child: Text(source.displayName),
        );
      }).toList(),
      onChanged: (value) {
        if (value != null) setState(() => _source = value);
      },
    );
  }

  Widget _buildCategoryDropdown(BuildContext context) {
    final bloc = ref.watch(ticketsBlocProvider);
    final state = bloc.state;
    List<TicketCategory> categories = [];
    if (state is TicketsLoaded) {
      categories = state.categories;
    }

    if (categories.isEmpty) {
      return const SizedBox.shrink();
    }

    return DropdownButtonFormField<String>(
      initialValue: _categoryId,
      decoration: const InputDecoration(
        labelText: 'Catégorie',
        prefixIcon: Icon(Icons.category_outlined),
      ),
      items: [
        const DropdownMenuItem(
          value: null,
          child: Text('Aucune catégorie'),
        ),
        ...categories.map((cat) => DropdownMenuItem(
          value: cat.id,
          child: Text(cat.name),
        )),
      ],
      onChanged: (value) => setState(() => _categoryId = value),
    );
  }

  Color _getPriorityColor(TicketPriority priority) {
    switch (priority) {
      case TicketPriority.basse:
        return AppTheme.statusArchive;
      case TicketPriority.normale:
        return AppTheme.infoColor;
      case TicketPriority.haute:
        return AppTheme.warningColor;
      case TicketPriority.urgente:
        return AppTheme.tertiaryColor;
      case TicketPriority.critique:
        return AppTheme.errorColor;
    }
  }
}
