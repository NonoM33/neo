import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../inputs/ds_number_stepper.dart';

/// Ligne de checklist d'audit — **le geste le plus repete de l'app**.
///
/// Case de 32 dp dans une cible de 56 dp, quantite au stepper, note et produit lie.
class DsChecklistRow extends StatelessWidget {
  const DsChecklistRow({
    required this.label,
    required this.checked,
    required this.onToggle,
    this.quantity,
    this.onQuantityChanged,
    this.note,
    this.productName,
    this.onTap,
    super.key,
  });

  final String label;
  final bool checked;
  final VoidCallback onToggle;
  final int? quantity;
  final ValueChanged<int>? onQuantityChanged;
  final String? note;
  final String? productName;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DsSpacing.s4,
        vertical: DsSpacing.s2,
      ),
      decoration: BoxDecoration(
        color: checked ? ds.soft(ds.success, 0.07) : ds.surfaceCard,
        borderRadius: DsRadius.cardAll,
        border: Border.all(
          color: checked ? ds.softBorder(ds.success, 0.28) : ds.borderSubtle,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Semantics(
                checked: checked,
                label: label,
                child: InkWell(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onToggle();
                  },
                  borderRadius: DsRadius.fullAll,
                  child: SizedBox.square(
                    dimension: DsSpacing.targetIdeal,
                    child: Center(
                      child: AnimatedContainer(
                        duration: DsMotion.duration(context, DsMotion.exit),
                        curve: DsMotion.easeExit,
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: checked ? ds.success : Colors.transparent,
                          borderRadius: DsRadius.smAll,
                          border: Border.all(
                            color: checked ? ds.success : ds.borderStrong,
                            width: 2,
                          ),
                        ),
                        child: checked
                            ? const Icon(
                                DsGlyph.check,
                                size: 24,
                                color: Colors.white,
                              )
                            : null,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: DsSpacing.s2),
              Expanded(
                child: GestureDetector(
                  onTap: onTap,
                  behavior: HitTestBehavior.opaque,
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: type.bodySize,
                      height: type.bodyLine / type.bodySize,
                      fontWeight: DsWeight.medium,
                      color: ds.textBody,
                    ),
                  ),
                ),
              ),
              if (checked && quantity != null) ...[
                const SizedBox(width: DsSpacing.s2),
                DsNumberStepper(
                  value: quantity!,
                  min: 1,
                  onChanged: onQuantityChanged,
                ),
              ],
            ],
          ),
          if (note != null || productName != null)
            Padding(
              padding: const EdgeInsets.only(
                left: DsSpacing.targetIdeal + DsSpacing.s2,
                bottom: DsSpacing.s2,
              ),
              child: Wrap(
                spacing: DsSpacing.s4,
                runSpacing: 4,
                children: [
                  if (productName != null)
                    _Meta(icon: DsGlyph.catalogue, text: productName!),
                  if (note != null) _Meta(icon: DsGlyph.note, text: note!),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        DsIcon(icon, size: 16, color: ds.textTertiary),
        const SizedBox(width: 5),
        Text(
          text,
          style: TextStyle(
            fontSize: context.dsType.captionSize,
            color: ds.textSecondary,
          ),
        ),
      ],
    );
  }
}
