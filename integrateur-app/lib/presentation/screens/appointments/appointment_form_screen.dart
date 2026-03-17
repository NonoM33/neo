import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/appointment.dart';
import '../../blocs/appointments/appointments_bloc.dart';
import '../../blocs/appointments/appointments_event.dart';
import '../../blocs/appointments/appointments_state.dart';

class AppointmentFormScreen extends ConsumerStatefulWidget {
  const AppointmentFormScreen({super.key});

  @override
  ConsumerState<AppointmentFormScreen> createState() => _AppointmentFormScreenState();
}

class _AppointmentFormScreenState extends ConsumerState<AppointmentFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _locationController = TextEditingController();
  final _notesController = TextEditingController();
  final _clientIdController = TextEditingController();
  final _projectIdController = TextEditingController();

  AppointmentType _selectedType = AppointmentType.visiteTechnique;
  LocationType _locationType = LocationType.surSite;
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();
  int _durationMinutes = 90;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _durationMinutes = _selectedType.defaultDurationMinutes;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    _notesController.dispose();
    _clientIdController.dispose();
    _projectIdController.dispose();
    super.dispose();
  }

  void _onTypeChanged(AppointmentType type) {
    setState(() {
      _selectedType = type;
      _durationMinutes = type.defaultDurationMinutes;
      if (_titleController.text.isEmpty) {
        _titleController.text = type.displayName;
      }
    });
  }

  Future<void> _selectDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('fr', 'FR'),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  DateTime get _scheduledAt {
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );
  }

  DateTime get _endAt {
    return _scheduledAt.add(Duration(minutes: _durationMinutes));
  }

  String get _endTimeFormatted {
    final end = _endAt;
    return '${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}';
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final title = _titleController.text.trim().isNotEmpty
        ? _titleController.text.trim()
        : _selectedType.displayName;

    HapticFeedback.lightImpact();
    setState(() => _isSubmitting = true);

    ref.read(appointmentsBlocProvider).add(AppointmentCreateRequested(
      title: title,
      type: _selectedType,
      scheduledAt: _scheduledAt,
      endAt: _endAt,
      durationMinutes: _durationMinutes,
      locationType: _locationType,
      location: _locationController.text.trim().isNotEmpty
          ? _locationController.text.trim()
          : null,
      clientId: _clientIdController.text.trim().isNotEmpty
          ? _clientIdController.text.trim()
          : null,
      projectId: _projectIdController.text.trim().isNotEmpty
          ? _projectIdController.text.trim()
          : null,
      notes: _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bloc = ref.watch(appointmentsBlocProvider);

    return PopScope(
      canPop: _titleController.text.isEmpty && _notesController.text.isEmpty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldPop = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Abandonner les modifications ?'),
            content: const Text('Les donnees saisies seront perdues.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Annuler'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Abandonner'),
              ),
            ],
          ),
        );
        if (shouldPop == true && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: BlocListener<AppointmentsBloc, AppointmentsState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is AppointmentOperationSuccess) {
            context.showSuccessSnackBar(state.message);
            Navigator.of(context).pop();
          } else if (state is AppointmentsError) {
            setState(() => _isSubmitting = false);
            context.showErrorSnackBar(state.message);
          }
        },
        child: Scaffold(
          backgroundColor: cs.surface,
          appBar: AppBar(
            title: const Text('Nouveau rendez-vous'),
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
                      : const Text('Creer'),
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
                      // Type picker
                      Text(
                        'Type de rendez-vous',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildTypePicker(context),
                      const SizedBox(height: AppSpacing.formSectionSpacing),

                      // Title
                      TextFormField(
                        controller: _titleController,
                        decoration: InputDecoration(
                          labelText: 'Titre',
                          hintText: _selectedType.displayName,
                          prefixIcon: const Icon(Icons.title_rounded),
                        ),
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Date & Time
                      Text(
                        'Date et heure',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          if (constraints.maxWidth >= 500) {
                            return Row(
                              children: [
                                Expanded(child: _buildDatePicker(context)),
                                const SizedBox(width: AppSpacing.formFieldSpacing),
                                Expanded(child: _buildTimePicker(context)),
                              ],
                            );
                          }
                          return Column(
                            children: [
                              _buildDatePicker(context),
                              const SizedBox(height: AppSpacing.formFieldSpacing),
                              _buildTimePicker(context),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Duration
                      _buildDurationPicker(context),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: cs.primary.withAlpha(10),
                          borderRadius: AppRadius.borderRadiusSm,
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline_rounded, size: 16, color: cs.primary),
                            const SizedBox(width: 8),
                            Text(
                              'Fin prevue a $_endTimeFormatted',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: cs.primary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.formSectionSpacing),

                      // Location
                      Text(
                        'Lieu',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildLocationTypePicker(context),
                      const SizedBox(height: AppSpacing.formFieldSpacing),
                      TextFormField(
                        controller: _locationController,
                        decoration: InputDecoration(
                          labelText: 'Adresse / Lien',
                          hintText: _locationType == LocationType.visio
                              ? 'Lien de visio...'
                              : _locationType == LocationType.telephone
                                  ? 'Numero de telephone...'
                                  : 'Adresse du lieu...',
                          prefixIcon: Icon(_getLocationTypeIcon(_locationType)),
                        ),
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: AppSpacing.formSectionSpacing),

                      // Client & Project IDs
                      LayoutBuilder(
                        builder: (context, constraints) {
                          if (constraints.maxWidth >= 500) {
                            return Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _clientIdController,
                                    decoration: const InputDecoration(
                                      labelText: 'ID Client',
                                      hintText: 'UUID du client',
                                      prefixIcon: Icon(Icons.person_outline_rounded),
                                    ),
                                    textInputAction: TextInputAction.next,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.formFieldSpacing),
                                Expanded(
                                  child: TextFormField(
                                    controller: _projectIdController,
                                    decoration: const InputDecoration(
                                      labelText: 'ID Projet',
                                      hintText: 'UUID du projet',
                                      prefixIcon: Icon(Icons.folder_outlined),
                                    ),
                                    textInputAction: TextInputAction.next,
                                  ),
                                ),
                              ],
                            );
                          }
                          return Column(
                            children: [
                              TextFormField(
                                controller: _clientIdController,
                                decoration: const InputDecoration(
                                  labelText: 'ID Client',
                                  hintText: 'UUID du client',
                                  prefixIcon: Icon(Icons.person_outline_rounded),
                                ),
                                textInputAction: TextInputAction.next,
                              ),
                              const SizedBox(height: AppSpacing.formFieldSpacing),
                              TextFormField(
                                controller: _projectIdController,
                                decoration: const InputDecoration(
                                  labelText: 'ID Projet',
                                  hintText: 'UUID du projet',
                                  prefixIcon: Icon(Icons.folder_outlined),
                                ),
                                textInputAction: TextInputAction.next,
                              ),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.formFieldSpacing),

                      // Notes
                      TextFormField(
                        controller: _notesController,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          labelText: 'Notes',
                          hintText: 'Informations supplementaires...',
                          alignLabelWithHint: true,
                          prefixIcon: Padding(
                            padding: EdgeInsets.only(bottom: 60),
                            child: Icon(Icons.notes_rounded),
                          ),
                        ),
                      ),

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
                              : const Text('Creer le rendez-vous'),
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

  Widget _buildTypePicker(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: AppointmentType.values.map((type) {
        final isSelected = _selectedType == type;
        final color = _getTypeColor(type);

        return Material(
          color: isSelected ? color.withAlpha(isDark ? 50 : 25) : Colors.transparent,
          borderRadius: AppRadius.borderRadiusMd,
          child: InkWell(
            onTap: () => _onTypeChanged(type),
            borderRadius: AppRadius.borderRadiusMd,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: AppRadius.borderRadiusMd,
                border: Border.all(
                  color: isSelected
                      ? color.withAlpha(isDark ? 100 : 60)
                      : (isDark ? Colors.white.withAlpha(20) : Theme.of(context).colorScheme.outlineVariant.withAlpha(40)),
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _getTypeIcon(type),
                    size: 18,
                    color: isSelected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    type.displayName,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isSelected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDatePicker(BuildContext context) {
    final dateFormatted = DateFormat('dd/MM/yyyy').format(_selectedDate);

    return InkWell(
      onTap: () => _selectDate(context),
      borderRadius: AppRadius.borderRadiusMd,
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Date',
          prefixIcon: Icon(Icons.calendar_today_rounded),
        ),
        child: Text(dateFormatted),
      ),
    );
  }

  Widget _buildTimePicker(BuildContext context) {
    final timeFormatted =
        '${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}';

    return InkWell(
      onTap: () => _selectTime(context),
      borderRadius: AppRadius.borderRadiusMd,
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Heure de debut',
          prefixIcon: Icon(Icons.access_time_rounded),
        ),
        child: Text(timeFormatted),
      ),
    );
  }

  Widget _buildDurationPicker(BuildContext context) {
    return DropdownButtonFormField<int>(
      value: _durationMinutes,
      decoration: const InputDecoration(
        labelText: 'Duree',
        prefixIcon: Icon(Icons.timer_outlined),
      ),
      items: [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480].map((d) {
        final hours = d ~/ 60;
        final minutes = d % 60;
        String label;
        if (hours > 0 && minutes > 0) {
          label = '${hours}h${minutes.toString().padLeft(2, '0')}';
        } else if (hours > 0) {
          label = '${hours}h';
        } else {
          label = '${minutes}min';
        }
        return DropdownMenuItem(value: d, child: Text(label));
      }).toList(),
      onChanged: (value) {
        if (value != null) setState(() => _durationMinutes = value);
      },
    );
  }

  Widget _buildLocationTypePicker(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: LocationType.values.map((type) {
        final isSelected = _locationType == type;

        return ChoiceChip(
          selected: isSelected,
          onSelected: (selected) {
            if (selected) setState(() => _locationType = type);
          },
          avatar: Icon(
            _getLocationTypeIcon(type),
            size: 18,
            color: isSelected ? cs.onPrimaryContainer : cs.onSurfaceVariant,
          ),
          label: Text(type.displayName),
        );
      }).toList(),
    );
  }

  Color _getTypeColor(AppointmentType type) {
    switch (type) {
      case AppointmentType.visiteTechnique:
        return AppTheme.infoColor;
      case AppointmentType.audit:
        return const Color(0xFF6f42c1);
      case AppointmentType.rdvCommercial:
        return AppTheme.successColor;
      case AppointmentType.installation:
        return AppTheme.tertiaryColor;
      case AppointmentType.sav:
        return AppTheme.errorColor;
      case AppointmentType.reunionInterne:
        return AppTheme.statusArchive;
      case AppointmentType.autre:
        return const Color(0xFFadb5bd);
    }
  }

  IconData _getTypeIcon(AppointmentType type) {
    switch (type) {
      case AppointmentType.visiteTechnique:
        return Icons.engineering_rounded;
      case AppointmentType.audit:
        return Icons.checklist_rounded;
      case AppointmentType.rdvCommercial:
        return Icons.handshake_rounded;
      case AppointmentType.installation:
        return Icons.build_rounded;
      case AppointmentType.sav:
        return Icons.support_agent_rounded;
      case AppointmentType.reunionInterne:
        return Icons.groups_rounded;
      case AppointmentType.autre:
        return Icons.event_rounded;
    }
  }

  IconData _getLocationTypeIcon(LocationType type) {
    switch (type) {
      case LocationType.surSite:
        return Icons.location_on_outlined;
      case LocationType.bureau:
        return Icons.business_outlined;
      case LocationType.visio:
        return Icons.videocam_outlined;
      case LocationType.telephone:
        return Icons.phone_outlined;
    }
  }
}
