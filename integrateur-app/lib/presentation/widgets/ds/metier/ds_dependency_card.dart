import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

enum DsDependencyLevel {
  obligatoire('Obligatoire'),
  recommande('Recommandé');

  const DsDependencyLevel(this.label);
  final String label;

  Color color(DsColors ds) => switch (this) {
        DsDependencyLevel.obligatoire => ds.error,
        DsDependencyLevel.recommande => ds.brandTertiary,
      };
}

@immutable
class DsDependencyItem {
  const DsDependencyItem({
    required this.name,
    required this.level,
    this.inQuote = false,
    this.onAdd,
  });

  final String name;
  final DsDependencyLevel level;

  /// Deja present dans le devis en cours.
  final bool inQuote;
  final VoidCallback? onAdd;
}

/// Dependances produit — composant strategique : il evite les oublis de materiel.
///
/// « Cet equipement necessite : … » se lit avant le prix, pas en bas de fiche.
class DsDependencyCard extends StatelessWidget {
  const DsDependencyCard({
    required this.items,
    this.title = 'Cet équipement nécessite',
    super.key,
  });

  final List<DsDependencyItem> items;
  final String title;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    if (items.isEmpty) return const SizedBox.shrink();

    final blocking = items.any(
      (item) => item.level == DsDependencyLevel.obligatoire && !item.inQuote,
    );
    final accent = blocking ? ds.error : ds.brandTertiary;

    return Container(
      padding: const EdgeInsets.all(DsSpacing.cardPadding),
      decoration: BoxDecoration(
        color: ds.soft(accent, 0.08),
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: ds.softBorder(accent, 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              DsIcon(DsGlyph.warning, size: 20, color: accent),
              const SizedBox(width: DsSpacing.s2),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: t.labelSize,
                    fontWeight: DsWeight.semibold,
                    letterSpacing: 0.3,
                    color: accent,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: DsSpacing.s3),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: DsSpacing.s2),
              child: Row(
                children: [
                  DsIcon(
                    item.inQuote ? DsGlyph.taskAlt : DsGlyph.catalogue,
                    size: 18,
                    color: item.inQuote ? ds.success : ds.textSecondary,
                  ),
                  const SizedBox(width: DsSpacing.s2),
                  Expanded(
                    child: Text(
                      item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: t.bodySize,
                        fontWeight: DsWeight.medium,
                        color: ds.textBody,
                      ),
                    ),
                  ),
                  const SizedBox(width: DsSpacing.s2),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: ds.soft(item.level.color(ds), 0.14),
                      borderRadius: DsRadius.badgeAll,
                      border: Border.all(
                        color: ds.softBorder(item.level.color(ds)),
                      ),
                    ),
                    child: Text(
                      item.level.label,
                      style: TextStyle(
                        fontSize: t.badgeSize,
                        fontWeight: DsWeight.semibold,
                        color: item.level.color(ds),
                      ),
                    ),
                  ),
                  if (item.inQuote)
                    Padding(
                      padding: const EdgeInsets.only(left: DsSpacing.s2),
                      child: Text(
                        'Au devis',
                        style: TextStyle(
                          fontSize: t.badgeSize,
                          fontWeight: DsWeight.semibold,
                          color: ds.success,
                        ),
                      ),
                    )
                  else if (item.onAdd != null)
                    TextButton(
                      onPressed: item.onAdd,
                      child: const Text('Ajouter'),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
