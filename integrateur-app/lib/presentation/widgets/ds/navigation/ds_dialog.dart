import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_button.dart';
import '../core/ds_icon.dart';

/// Dialog iPad — 400 a 560 pt, radius 24, y compris les confirmations destructives.
class DsDialog extends StatelessWidget {
  const DsDialog({
    required this.title,
    this.description,
    this.content,
    this.actions = const <Widget>[],
    this.destructive = false,
    this.icon,
    super.key,
  });

  final String title;
  final String? description;
  final Widget? content;
  final List<Widget> actions;
  final bool destructive;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final accent = destructive ? ds.error : ds.brandPrimary;

    return Dialog(
      backgroundColor: ds.surface4,
      insetPadding: const EdgeInsets.all(DsSpacing.s6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DsRadius.dialog),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minWidth: DsSpacing.dialogMinWidth,
          maxWidth: DsSpacing.dialogMaxWidth,
        ),
        child: Padding(
          padding: const EdgeInsets.all(DsSpacing.s6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (icon != null || destructive) ...[
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: ds.soft(accent),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: DsIcon(
                    icon ?? DsGlyph.warning,
                    size: 26,
                    color: accent,
                  ),
                ),
                const SizedBox(height: DsSpacing.s4),
              ],
              Text(
                title,
                style: TextStyle(
                  fontSize: type.h3Size,
                  height: type.h3Line / type.h3Size,
                  fontWeight: DsWeight.semibold,
                  letterSpacing: -0.3,
                  color: ds.textPrimary,
                ),
              ),
              if (description != null) ...[
                const SizedBox(height: DsSpacing.s2),
                Text(
                  description!,
                  style: TextStyle(
                    fontSize: type.bodySize,
                    height: type.bodyLine / type.bodySize,
                    color: ds.textSecondary,
                  ),
                ),
              ],
              if (content != null) ...[
                const SizedBox(height: DsSpacing.s4),
                Flexible(child: SingleChildScrollView(child: content!)),
              ],
              if (actions.isNotEmpty) ...[
                const SizedBox(height: DsSpacing.s6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    for (var i = 0; i < actions.length; i++) ...[
                      if (i > 0) const SizedBox(width: DsSpacing.s2),
                      actions[i],
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Confirmation destructive : « Supprimer ce projet ? » + consequence explicite.
Future<bool> showDsConfirmDialog(
  BuildContext context, {
  required String title,
  required String description,
  String confirmLabel = 'Supprimer',
  String cancelLabel = 'Annuler',
  bool destructive = true,
  IconData? icon,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => DsDialog(
      title: title,
      description: description,
      destructive: destructive,
      icon: icon,
      actions: [
        DsButton(
          label: cancelLabel,
          variant: DsButtonVariant.ghost,
          onPressed: () => Navigator.of(dialogContext).pop(false),
        ),
        DsButton(
          label: confirmLabel,
          variant:
              destructive ? DsButtonVariant.danger : DsButtonVariant.primary,
          onPressed: () => Navigator.of(dialogContext).pop(true),
        ),
      ],
    ),
  );
  return result ?? false;
}
