import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Champ date / heure — format francais : `samedi 16 août 2026`, `09:30`.
class DsDateTimeField extends StatelessWidget {
  const DsDateTimeField({
    required this.label,
    required this.value,
    required this.onChanged,
    this.mode = DsDateTimeMode.dateTime,
    this.firstDate,
    this.lastDate,
    this.enabled = true,
    this.required = false,
    super.key,
  });

  final String label;
  final DateTime? value;
  final ValueChanged<DateTime> onChanged;
  final DsDateTimeMode mode;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final bool enabled;
  final bool required;

  String _format() {
    if (value == null) return 'Choisir…';
    return switch (mode) {
      DsDateTimeMode.date =>
        DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(value!),
      DsDateTimeMode.time => DateFormat('HH:mm', 'fr_FR').format(value!),
      DsDateTimeMode.dateTime =>
        DateFormat("EEEE d MMMM yyyy 'à' HH:mm", 'fr_FR').format(value!),
    };
  }

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    var result = value ?? now;

    if (mode != DsDateTimeMode.time) {
      final date = await showDatePicker(
        context: context,
        initialDate: result,
        firstDate: firstDate ?? DateTime(now.year - 2),
        lastDate: lastDate ?? DateTime(now.year + 3),
        locale: const Locale('fr', 'FR'),
      );
      if (date == null) return;
      result = DateTime(date.year, date.month, date.day, result.hour, result.minute);
    }

    if (mode != DsDateTimeMode.date) {
      if (!context.mounted) return;
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(result),
      );
      if (time == null) return;
      result = DateTime(
        result.year,
        result.month,
        result.day,
        time.hour,
        time.minute,
      );
    }

    HapticFeedback.selectionClick();
    onChanged(result);
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: type.labelSize,
                fontWeight: DsWeight.semibold,
                color: ds.textBody,
              ),
            ),
            if (required)
              Text(
                ' *',
                style: TextStyle(
                  fontSize: type.labelSize,
                  fontWeight: DsWeight.semibold,
                  color: ds.error,
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Material(
          color: ds.surface3,
          borderRadius: DsRadius.mdAll,
          child: InkWell(
            onTap: enabled ? () => _pick(context) : null,
            borderRadius: DsRadius.mdAll,
            child: Container(
              constraints: const BoxConstraints(minHeight: DsSpacing.targetMin),
              padding: const EdgeInsets.symmetric(
                horizontal: DsSpacing.s4,
                vertical: DsSpacing.s3,
              ),
              decoration: BoxDecoration(
                borderRadius: DsRadius.mdAll,
                border: Border.all(color: ds.borderDefault),
              ),
              child: Row(
                children: [
                  DsIcon(
                    mode == DsDateTimeMode.time
                        ? DsGlyph.schedule
                        : DsGlyph.event,
                    size: 22,
                    color: ds.textSecondary,
                  ),
                  const SizedBox(width: DsSpacing.s3),
                  Expanded(
                    child: Text(
                      _format(),
                      style: TextStyle(
                        fontSize: type.bodySize,
                        color: value == null ? ds.textTertiary : ds.textPrimary,
                        fontFeatures: dsTabularFigures,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

enum DsDateTimeMode { date, time, dateTime }
