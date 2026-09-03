import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

/// App bar contextuelle.
///
/// Sur un ecran immersif (audit, plan, signature), `backLabel` est **obligatoire** :
/// jamais une fleche muette.
class DsAppBar extends StatelessWidget implements PreferredSizeWidget {
  const DsAppBar({
    required this.title,
    this.subtitle,
    this.backLabel,
    this.onBack,
    this.actions = const <Widget>[],
    this.leading,
    this.immersive = false,
    this.bottom,
    super.key,
  });

  final String title;
  final String? subtitle;

  /// Libelle explicite du retour (« Retour au projet »).
  final String? backLabel;
  final VoidCallback? onBack;
  final List<Widget> actions;
  final Widget? leading;
  final bool immersive;
  final PreferredSizeWidget? bottom;

  /// Hauteur du contenu de la barre, hors marges et bordure.
  ///
  /// Plancher : la cible tactile des actions (48 pt). Avec un sous-titre,
  /// c'est le bloc de texte qui mene — h3 + caption a l'echelle tablette,
  /// majores du facteur d'accessibilite maximal autorise (1.2).
  double get _contentHeight {
    const titleWithSubtitle = 62.0;
    if (subtitle == null) return DsSpacing.targetMin;
    return titleWithSubtitle > DsSpacing.targetMin
        ? titleWithSubtitle
        : DsSpacing.targetMin;
  }

  /// Hauteur reservee par le Scaffold (hors encoche : le Scaffold ajoute
  /// lui-meme la marge haute de l'ecran).
  @override
  Size get preferredSize {
    const verticalPadding = DsSpacing.s2 * 2;
    const bottomBorder = 1.0;
    final base =
        verticalPadding + _contentHeight + bottomBorder + (immersive ? 12 : 0);
    return Size.fromHeight(base + (bottom?.preferredSize.height ?? 0));
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final compact = context.dsDevice.isPhone;

    return Container(
      decoration: BoxDecoration(
        color: ds.surfaceBase,
        border: Border(bottom: BorderSide(color: ds.borderSubtle)),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: EdgeInsets.symmetric(
                horizontal: compact ? DsSpacing.s2 : DsSpacing.s4,
                vertical: DsSpacing.s2,
              ),
              child: SizedBox(
                height: _contentHeight + (immersive ? 12 : 0),
                child: Row(
                  children: [
                    if (leading != null)
                      leading!
                    else if (onBack != null) ...[
                      DsIconButton(
                        icon: DsGlyph.back,
                        label: backLabel ?? 'Retour',
                        onPressed: onBack,
                      ),
                      if (backLabel != null && !compact)
                        Padding(
                          padding: const EdgeInsets.only(right: DsSpacing.s2),
                          child: TextButton(
                            onPressed: onBack,
                            child: Text(backLabel!),
                          ),
                        ),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            title,
                            style: TextStyle(
                              fontSize: type.h3Size,
                              height: type.h3Line / type.h3Size,
                              fontWeight: DsWeight.semibold,
                              letterSpacing: -0.3,
                              color: ds.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (subtitle != null)
                            Text(
                              subtitle!,
                              style: TextStyle(
                                fontSize: type.captionSize,
                                color: ds.textSecondary,
                                height: 1.3,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    ...actions,
                  ],
                ),
              ),
            ),
            ?bottom,
          ],
        ),
      ),
    );
  }
}
