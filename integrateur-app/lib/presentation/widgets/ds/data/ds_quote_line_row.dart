import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';
import '../inputs/ds_number_stepper.dart';

/// Types de ligne de devis.
enum DsQuoteLineType {
  produit('Produit', DsGlyph.catalogue),
  mainOeuvre('Main d’œuvre', DsGlyph.engineering),
  forfait('Forfait', DsGlyph.receipt);

  const DsQuoteLineType(this.label, this.icon);
  final String label;
  final IconData icon;

  Color color(DsColors ds) => switch (this) {
        DsQuoteLineType.produit => ds.brandPrimary,
        DsQuoteLineType.mainOeuvre => ds.brandSecondary,
        DsQuoteLineType.forfait => ds.statusBrouillon,
      };
}

/// Ligne de devis — composant riche, **jamais un `ListTile`**.
///
/// Le marqueur « Déjà possédé » est explicite : c'est du materiel que le client
/// a deja, il ne doit pas etre facture.
class DsQuoteLineRow extends StatelessWidget {
  const DsQuoteLineRow({
    required this.type,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.total,
    this.room,
    this.unit,
    this.owned = false,
    this.locked = false,
    this.onQuantityChanged,
    this.onRemove,
    this.onTap,
    super.key,
  });

  final DsQuoteLineType type;
  final String description;
  final int quantity;

  /// Deja formate : `59,90 €`.
  final String unitPrice;
  final String total;
  final String? room;
  final String? unit;
  final bool owned;
  final bool locked;
  final ValueChanged<int>? onQuantityChanged;
  final VoidCallback? onRemove;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type_ = context.dsType;
    final accent = type.color(ds);

    return Container(
      padding: const EdgeInsets.all(DsSpacing.s4),
      decoration: BoxDecoration(
        color: ds.surfaceCard,
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: ds.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: ds.soft(accent, 0.12),
                  borderRadius: DsRadius.mdAll,
                ),
                alignment: Alignment.center,
                child: DsIcon(type.icon, size: 22, color: accent),
              ),
              const SizedBox(width: DsSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: type_.bodySize,
                        height: type_.bodyLine / type_.bodySize,
                        fontWeight: DsWeight.semibold,
                        color: ds.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: DsSpacing.s3,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          type.label,
                          style: TextStyle(
                            fontSize: type_.badgeSize,
                            fontWeight: DsWeight.semibold,
                            color: accent,
                          ),
                        ),
                        if (room != null)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              DsIcon(
                                DsGlyph.room,
                                size: 14,
                                color: ds.textSecondary,
                              ),
                              const SizedBox(width: 3),
                              Text(
                                room!,
                                style: TextStyle(
                                  fontSize: type_.badgeSize,
                                  color: ds.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        if (owned) _OwnedBadge(),
                      ],
                    ),
                  ],
                ),
              ),
              if (!locked && onRemove != null)
                DsIconButton(
                  icon: DsGlyph.delete,
                  label: 'Supprimer la ligne',
                  tone: ds.textTertiary,
                  onPressed: onRemove,
                ),
            ],
          ),
          const SizedBox(height: DsSpacing.s3),
          Row(
            children: [
              DsNumberStepper(
                value: quantity,
                min: 1,
                unit: unit,
                enabled: !locked,
                onChanged: onQuantityChanged,
              ),
              const Spacer(),
              Text(
                '$unitPrice / u HT',
                style: TextStyle(
                  fontSize: type_.captionSize,
                  fontFeatures: dsTabularFigures,
                  color: ds.textSecondary,
                ),
              ),
              const SizedBox(width: DsSpacing.s4),
              Text(
                total,
                style: TextStyle(
                  fontSize: type_.numericSize,
                  fontWeight: DsWeight.semibold,
                  fontFeatures: dsTabularFigures,
                  color: owned ? ds.textTertiary : ds.textPrimary,
                  decoration: owned ? TextDecoration.lineThrough : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OwnedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: ds.soft(ds.success, 0.14),
        borderRadius: DsRadius.badgeAll,
        border: Border.all(color: ds.softBorder(ds.success)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DsIcon(DsGlyph.taskAlt, size: 14, color: ds.success),
          const SizedBox(width: 3),
          Text(
            'Déjà possédé',
            style: TextStyle(
              fontSize: context.dsType.badgeSize,
              fontWeight: DsWeight.semibold,
              color: ds.success,
            ),
          ),
        ],
      ),
    );
  }
}
