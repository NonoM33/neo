import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

enum DsTotalsLayout {
  /// Barre collante en bas (iPhone, iPad portrait).
  sticky,

  /// Panneau lateral (iPad paysage).
  panel,
}

/// Barre de totaux du devis — collante, tres lisible, **montrable au client**.
///
/// En mode client : ni marge, ni prix d'achat. Seulement sous-total, remise,
/// TVA et TTC. La mention HT / TTC est systematique (enjeu legal).
class DsQuoteTotalsBar extends StatelessWidget {
  const DsQuoteTotalsBar({
    required this.subtotalHT,
    required this.totalTTC,
    this.discount,
    this.totalHT,
    this.vat,
    this.quoteNumber,
    this.validityLabel,
    this.layout = DsTotalsLayout.sticky,
    this.clientMode = false,
    this.actions,
    super.key,
  });

  /// Montants deja formates : `1 234,56 €`.
  final String subtotalHT;
  final String totalTTC;
  final String? discount;
  final String? totalHT;
  final String? vat;
  final String? quoteNumber;

  /// « Valable jusqu'au 15 septembre 2026 ».
  final String? validityLabel;
  final DsTotalsLayout layout;
  final bool clientMode;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final sticky = layout == DsTotalsLayout.sticky;

    Widget line(String label, String value, {bool strong = false, Color? tone}) {
      return Padding(
        padding: const EdgeInsets.only(bottom: DsSpacing.s3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: strong ? t.bodyLgSize : t.bodySize,
                  fontWeight:
                      strong ? DsWeight.semibold : DsWeight.regular,
                  color: tone ?? (strong ? ds.textPrimary : ds.textSecondary),
                ),
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: strong ? t.h3Size : t.bodySize,
                fontWeight: DsWeight.semibold,
                fontFeatures: dsTabularFigures,
                color: tone ?? ds.textPrimary,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: EdgeInsets.all(
        clientMode ? DsSpacing.s6 : DsSpacing.cardPadding,
      ),
      decoration: BoxDecoration(
        color: ds.surface1,
        borderRadius: sticky ? null : DsRadius.cardAll,
        border: sticky
            ? Border(top: BorderSide(color: ds.borderDefault))
            : Border.all(color: ds.borderSubtle),
        boxShadow: sticky ? ds.elevationSticky : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (quoteNumber != null || validityLabel != null) ...[
            Row(
              children: [
                if (quoteNumber != null)
                  Text(
                    quoteNumber!,
                    style: TextStyle(
                      fontSize: t.badgeSize,
                      fontWeight: DsWeight.semibold,
                      letterSpacing: 0.4,
                      fontFeatures: dsTabularFigures,
                      color: ds.textTertiary,
                    ),
                  ),
                const Spacer(),
                if (validityLabel != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DsIcon(
                        DsGlyph.eventAvailable,
                        size: 15,
                        color: ds.textTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        validityLabel!,
                        style: TextStyle(
                          fontSize: t.badgeSize,
                          fontWeight: DsWeight.semibold,
                          color: ds.textTertiary,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: DsSpacing.s3),
          ],
          line('Sous-total HT', subtotalHT),
          if (discount != null)
            line('Remise', discount!, tone: ds.success),
          if (totalHT != null) line('Total HT', totalHT!),
          if (vat != null) line('TVA', vat!),
          Divider(color: ds.borderDefault, height: DsSpacing.s4),
          line('Total TTC', totalTTC, strong: true),
          if (actions != null) ...[
            const SizedBox(height: DsSpacing.s1),
            actions!,
          ],
        ],
      ),
    );
  }
}
