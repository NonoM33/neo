import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/appointment.dart';
import '../../../domain/repositories/auth_repository.dart';

class AvailabilityScreen extends ConsumerStatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  ConsumerState<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends ConsumerState<AvailabilityScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  /// Slots indexed by DayOfWeek
  final Map<DayOfWeek, List<_SlotEntry>> _weekSlots = {};

  @override
  void initState() {
    super.initState();
    _initializeDefaultSlots();
    _loadAvailability();
  }

  void _initializeDefaultSlots() {
    // Initialize all days with no slots
    for (final day in DayOfWeek.values) {
      _weekSlots[day] = [];
    }
  }

  Future<void> _loadAvailability() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Get current user ID
    final authRepo = ref.read(authRepositoryProvider);
    final userResult = await authRepo.getCurrentUser();
    String? userId;
    if (userResult is Success) {
      userId = (userResult as Success).data?.id;
    }

    if (userId == null) {
      setState(() {
        _isLoading = false;
        _error = 'Utilisateur non connecte';
      });
      return;
    }

    final getAvailability = ref.read(getAvailabilityUseCaseProvider);
    final result = await getAvailability(userId);

    switch (result) {
      case Success(data: final slots):
        _initializeDefaultSlots();
        for (final slot in slots) {
          _weekSlots[slot.dayOfWeek]?.add(_SlotEntry(
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: slot.isActive,
          ));
        }
        setState(() => _isLoading = false);
      case Error(failure: final failure):
        setState(() {
          _isLoading = false;
          _error = failure.message;
        });
    }
  }

  void _addSlot(DayOfWeek day) {
    setState(() {
      _weekSlots[day]?.add(const _SlotEntry(
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      ));
    });
  }

  void _removeSlot(DayOfWeek day, int index) {
    setState(() {
      _weekSlots[day]?.removeAt(index);
    });
  }

  void _toggleSlot(DayOfWeek day, int index) {
    setState(() {
      final slot = _weekSlots[day]![index];
      _weekSlots[day]![index] = _SlotEntry(
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: !slot.isActive,
      );
    });
  }

  Future<void> _updateSlotTime(DayOfWeek day, int index, bool isStart) async {
    final slot = _weekSlots[day]![index];
    final currentTime = _parseTime(isStart ? slot.startTime : slot.endTime);

    final picked = await showTimePicker(
      context: context,
      initialTime: currentTime,
    );

    if (picked != null) {
      final timeStr = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() {
        if (isStart) {
          _weekSlots[day]![index] = _SlotEntry(
            startTime: timeStr,
            endTime: slot.endTime,
            isActive: slot.isActive,
          );
        } else {
          _weekSlots[day]![index] = _SlotEntry(
            startTime: slot.startTime,
            endTime: timeStr,
            isActive: slot.isActive,
          );
        }
      });
    }
  }

  TimeOfDay _parseTime(String time) {
    final parts = time.split(':');
    return TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);

    // Get current user ID
    final authRepo = ref.read(authRepositoryProvider);
    final userResult = await authRepo.getCurrentUser();
    String? userId;
    if (userResult is Success) {
      userId = (userResult as Success).data?.id;
    }

    if (userId == null) {
      setState(() => _isSaving = false);
      if (mounted) {
        context.showErrorSnackBar('Utilisateur non connecte');
      }
      return;
    }

    // Build slots list
    final slots = <AvailabilitySlot>[];
    int index = 0;
    for (final entry in _weekSlots.entries) {
      for (final slot in entry.value) {
        slots.add(AvailabilitySlot(
          id: 'temp_$index',
          userId: userId,
          dayOfWeek: entry.key,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
        ));
        index++;
      }
    }

    final setAvailability = ref.read(setAvailabilityUseCaseProvider);
    final result = await setAvailability(userId, slots);

    setState(() => _isSaving = false);

    if (mounted) {
      switch (result) {
        case Success():
          context.showSuccessSnackBar('Disponibilites enregistrees');
        case Error(failure: final failure):
          context.showErrorSnackBar(failure.message);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: const Text('Disponibilites'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: FilledButton(
              onPressed: _isSaving ? null : _save,
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Enregistrer'),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline_rounded, size: 48, color: cs.error),
                      const SizedBox(height: 16),
                      Text(_error!),
                      const SizedBox(height: 16),
                      FilledButton.tonalIcon(
                        onPressed: _loadAvailability,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Recharger'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: AppSpacing.formPadding,
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 700),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Info card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: cs.primary.withAlpha(isDark ? 15 : 10),
                              borderRadius: AppRadius.borderRadiusMd,
                              border: Border.all(color: cs.primary.withAlpha(isDark ? 30 : 20)),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline_rounded, size: 20, color: cs.primary),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Definissez vos creneaux de disponibilite hebdomadaires. '
                                    'Ces creneaux seront utilises pour la prise de rendez-vous.',
                                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Days
                          ...DayOfWeek.values.map((day) {
                            final slots = _weekSlots[day] ?? [];
                            final isWeekend =
                                day == DayOfWeek.samedi || day == DayOfWeek.dimanche;

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? cs.surfaceContainerLow
                                      : cs.surfaceContainerLowest,
                                  borderRadius: AppRadius.borderRadiusLg,
                                  border: Border.all(
                                    color: isDark
                                        ? Colors.white.withAlpha(12)
                                        : cs.outlineVariant.withAlpha(40),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          day.displayName,
                                          style: tt.titleSmall?.copyWith(
                                            fontWeight: FontWeight.w600,
                                            color: isWeekend
                                                ? cs.onSurfaceVariant
                                                : null,
                                          ),
                                        ),
                                        if (isWeekend) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: cs.surfaceContainerHighest,
                                              borderRadius: AppRadius.borderRadiusSm,
                                            ),
                                            child: Text(
                                              'Weekend',
                                              style: tt.labelSmall?.copyWith(
                                                color: cs.onSurfaceVariant,
                                                fontSize: 10,
                                              ),
                                            ),
                                          ),
                                        ],
                                        const Spacer(),
                                        IconButton(
                                          icon: const Icon(Icons.add_rounded, size: 20),
                                          tooltip: 'Ajouter un creneau',
                                          onPressed: () => _addSlot(day),
                                        ),
                                      ],
                                    ),
                                    if (slots.isEmpty)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        child: Text(
                                          'Aucun creneau',
                                          style: tt.bodySmall?.copyWith(
                                            color: cs.onSurfaceVariant.withAlpha(120),
                                          ),
                                        ),
                                      )
                                    else
                                      ...slots.asMap().entries.map((entry) {
                                        final index = entry.key;
                                        final slot = entry.value;

                                        return Padding(
                                          padding: const EdgeInsets.only(top: 8),
                                          child: Row(
                                            children: [
                                              // Toggle active
                                              Switch(
                                                value: slot.isActive,
                                                onChanged: (_) =>
                                                    _toggleSlot(day, index),
                                              ),
                                              const SizedBox(width: 8),
                                              // Start time
                                              InkWell(
                                                onTap: slot.isActive
                                                    ? () => _updateSlotTime(
                                                        day, index, true)
                                                    : null,
                                                borderRadius: AppRadius.borderRadiusSm,
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(
                                                    horizontal: 12,
                                                    vertical: 8,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: slot.isActive
                                                        ? cs.primary.withAlpha(
                                                            isDark ? 20 : 12)
                                                        : cs.surfaceContainerHighest,
                                                    borderRadius:
                                                        AppRadius.borderRadiusSm,
                                                  ),
                                                  child: Text(
                                                    slot.startTime,
                                                    style: tt.bodyMedium?.copyWith(
                                                      fontWeight: FontWeight.w600,
                                                      color: slot.isActive
                                                          ? cs.primary
                                                          : cs.onSurfaceVariant,
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              Padding(
                                                padding: const EdgeInsets.symmetric(
                                                    horizontal: 8),
                                                child: Text(
                                                  '-',
                                                  style: tt.bodyMedium?.copyWith(
                                                    color: cs.onSurfaceVariant,
                                                  ),
                                                ),
                                              ),
                                              // End time
                                              InkWell(
                                                onTap: slot.isActive
                                                    ? () => _updateSlotTime(
                                                        day, index, false)
                                                    : null,
                                                borderRadius: AppRadius.borderRadiusSm,
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(
                                                    horizontal: 12,
                                                    vertical: 8,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: slot.isActive
                                                        ? cs.primary.withAlpha(
                                                            isDark ? 20 : 12)
                                                        : cs.surfaceContainerHighest,
                                                    borderRadius:
                                                        AppRadius.borderRadiusSm,
                                                  ),
                                                  child: Text(
                                                    slot.endTime,
                                                    style: tt.bodyMedium?.copyWith(
                                                      fontWeight: FontWeight.w600,
                                                      color: slot.isActive
                                                          ? cs.primary
                                                          : cs.onSurfaceVariant,
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const Spacer(),
                                              // Remove button
                                              IconButton(
                                                icon: Icon(
                                                  Icons.delete_outline_rounded,
                                                  size: 20,
                                                  color: cs.error,
                                                ),
                                                tooltip: 'Supprimer',
                                                onPressed: () =>
                                                    _removeSlot(day, index),
                                              ),
                                            ],
                                          ),
                                        );
                                      }),
                                  ],
                                ),
                              ),
                            );
                          }),

                          const SizedBox(height: 24),

                          // Save button
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: _isSaving ? null : _save,
                              icon: _isSaving
                                  ? null
                                  : const Icon(Icons.save_rounded),
                              label: _isSaving
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : const Text('Enregistrer les disponibilites'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }
}

/// Internal slot entry for the form state
class _SlotEntry {
  final String startTime;
  final String endTime;
  final bool isActive;

  const _SlotEntry({
    required this.startTime,
    required this.endTime,
    this.isActive = true,
  });
}
