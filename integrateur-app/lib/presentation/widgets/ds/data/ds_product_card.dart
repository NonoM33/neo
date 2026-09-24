import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_card.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

/// Niveau de stock — couleur + libelle, jamais la couleur seule.
enum DsStockLevel {
  disponible('En stock'),
  faible('Stock faible'),
  rupture('Rupture de stock');

  const DsStockLevel(this.label);
  final String label;

  static DsStockLevel fromQuantity(int quantity) => switch (quantity) {
        <= 0 => DsStockLevel.rupture,
        < 5 => DsStockLevel.faible,
        _ => DsStockLevel.disponible,
      };

  Color color(DsColors ds) => switch (this) {
        DsStockLevel.disponible => ds.success,
        DsStockLevel.faible => ds.brandTertiary,
        DsStockLevel.rupture => ds.error,
      };
}

/// Card produit du catalogue.
///
/// L'image vient du catalogue distant (`cached_network_image`) ; en son absence
/// on montre un emplacement lisible, jamais une icone minuscule.
class DsProductCard extends StatelessWidget {
  const DsProductCard({
    required this.name,
    required this.brand,
    required this.reference,
    required this.priceHT,
    this.priceTTC,
    this.imageUrl,
    this.protocols = const <String>[],
    this.stock,
    this.favorite = false,
    this.onToggleFavorite,
    this.onTap,
    this.compact = false,
    super.key,
  });

  final String name;
  final String brand;
  final String reference;

  /// Deja formate : `59,90 €`.
  final String priceHT;
  final String? priceTTC;
  final String? imageUrl;
  final List<String> protocols;
  final DsStockLevel? stock;
  final bool favorite;
  final VoidCallback? onToggleFavorite;
  final VoidCallback? onTap;
  final bool compact;

  /// Hauteur reservee pour une carte produit en grille.
  ///
  /// Un `childAspectRatio` fixe liait la hauteur a la largeur : des que la
  /// grille se resserrait — catalogue a trois zones, panneaux ouverts — les
  /// cellules devenaient trop courtes et le bloc texte, lui, ne se comprime
  /// pas. Ici la hauteur suit le contenu, et l'image prend ce qui reste.
  static double gridExtent(BuildContext context, {double imageHeight = 150}) {
    final type = context.dsType;

    final textBlock = type.badgeSize + 4 // marque
        + 2
        + (type.bodySize * 1.3) * 2 // nom sur deux lignes
        + 4
        + type.badgeSize + 4 // reference
        + DsSpacing.s2
        + type.numericSize + 6 // prix HT
        + type.badgeSize + 4 // prix TTC
        + DsSpacing.s2;

    return DsSpacing.s3 * 2 // marges internes
        + imageHeight
        + DsSpacing.s3
        + textBlock
        + 6; // marge de securite
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return DsCard(
      onTap: onTap,
      padding: const EdgeInsets.all(DsSpacing.s3),
      semanticLabel: '$name, $brand, $priceHT hors taxes',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!compact)
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: DsRadius.mdAll,
                      child: ColoredBox(
                        color: ds.surfaceSunken,
                        child: imageUrl == null || imageUrl!.isEmpty
                            ? Center(
                                child: DsIcon(
                                  DsGlyph.catalogue,
                                  size: 40,
                                  color: ds.textTertiary,
                                ),
                              )
                            : CachedNetworkImage(
                                imageUrl: imageUrl!,
                                fit: BoxFit.contain,
                                errorWidget: (_, _, _) => Center(
                                  child: DsIcon(
                                    DsGlyph.catalogue,
                                    size: 40,
                                    color: ds.textTertiary,
                                  ),
                                ),
                              ),
                      ),
                    ),
                  ),
                  if (onToggleFavorite != null)
                    Positioned(
                      top: 0,
                      right: 0,
                      child: DsIconButton(
                        icon: favorite
                            ? DsGlyph.favorite
                            : DsGlyph.favoriteOutline,
                        label: favorite
                            ? 'Retirer des favoris'
                            : 'Ajouter aux favoris',
                        active: favorite,
                        tone: favorite ? ds.error : ds.textSecondary,
                        onPressed: onToggleFavorite,
                      ),
                    ),
                ],
              ),
            ),
          if (!compact) const SizedBox(height: DsSpacing.s3),
          Text(
            brand.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: type.badgeSize,
              fontWeight: DsWeight.semibold,
              letterSpacing: 0.6,
              color: ds.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: type.bodySize,
              height: 1.3,
              fontWeight: DsWeight.semibold,
              color: ds.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Réf. $reference',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: type.badgeSize,
              fontFeatures: dsTabularFigures,
              color: ds.textTertiary,
            ),
          ),
          if (protocols.isNotEmpty) ...[
            const SizedBox(height: DsSpacing.s2),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: [
                for (final protocol in protocols.take(3))
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: ds.surfaceSunken,
                      borderRadius: DsRadius.badgeAll,
                    ),
                    child: Text(
                      protocol,
                      style: TextStyle(
                        fontSize: type.badgeSize,
                        fontWeight: DsWeight.medium,
                        color: ds.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: DsSpacing.s2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$priceHT HT',
                      style: TextStyle(
                        fontSize: type.numericSize,
                        fontWeight: DsWeight.semibold,
                        fontFeatures: dsTabularFigures,
                        color: ds.textPrimary,
                      ),
                    ),
                    if (priceTTC != null)
                      Text(
                        '$priceTTC TTC',
                        style: TextStyle(
                          fontSize: type.badgeSize,
                          fontFeatures: dsTabularFigures,
                          color: ds.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              if (stock != null) _StockBadge(level: stock!),
            ],
          ),
        ],
      ),
    );
  }
}

class _StockBadge extends StatelessWidget {
  const _StockBadge({required this.level});

  final DsStockLevel level;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final color = level.color(ds);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: ds.soft(color),
        borderRadius: DsRadius.badgeAll,
        border: Border.all(color: ds.softBorder(color)),
      ),
      child: Text(
        level.label,
        style: TextStyle(
          fontSize: context.dsType.badgeSize,
          fontWeight: DsWeight.semibold,
          color: color,
        ),
      ),
    );
  }
}
