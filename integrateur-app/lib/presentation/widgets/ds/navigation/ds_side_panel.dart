import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

/// Panneau lateral iPad — filtres catalogue, proprietes du plan, recapitulatif de devis.
///
/// Largeur en **proportion** de l'ecran, jamais en pixels durs.
/// Replie, il se reduit a une colonne de 56 dp avec son titre vertical.
class DsSidePanel extends StatelessWidget {
  const DsSidePanel({
    required this.title,
    required this.child,
    this.widthFactor = 0.3,
    this.minWidth = 280,
    this.maxWidth = 420,
    this.footer,
    this.actions = const <Widget>[],
    this.collapsed = false,
    this.onToggleCollapsed,
    this.side = DsPanelSide.right,
    super.key,
  });

  final String title;
  final Widget child;
  final double widthFactor;
  final double minWidth;
  final double maxWidth;
  final Widget? footer;
  final List<Widget> actions;
  final bool collapsed;
  final VoidCallback? onToggleCollapsed;
  final DsPanelSide side;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    final border = BorderSide(color: ds.borderSubtle);

    if (collapsed) {
      return Container(
        width: DsSpacing.targetIdeal,
        decoration: BoxDecoration(
          color: ds.surface1,
          border: side == DsPanelSide.right
              ? Border(left: border)
              : Border(right: border),
        ),
        child: Column(
          children: [
            const SizedBox(height: DsSpacing.s2),
            DsIconButton(
              icon: side == DsPanelSide.right
                  ? Icons.keyboard_double_arrow_left_rounded
                  : Icons.keyboard_double_arrow_right_rounded,
              label: 'Déplier $title',
              onPressed: onToggleCollapsed,
            ),
            const SizedBox(height: DsSpacing.s2),
            Expanded(
              child: RotatedBox(
                quarterTurns: 3,
                child: Center(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: type.labelSize,
                      fontWeight: DsWeight.semibold,
                      letterSpacing: 0.4,
                      color: ds.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    final width = (MediaQuery.sizeOf(context).width * widthFactor)
        .clamp(minWidth, maxWidth);

    return Container(
      width: width,
      decoration: BoxDecoration(
        color: ds.surface1,
        border: side == DsPanelSide.right
            ? Border(left: border)
            : Border(right: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DsSpacing.s5,
              DsSpacing.s4,
              DsSpacing.s2,
              DsSpacing.s3,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: type.titleSize,
                      fontWeight: DsWeight.semibold,
                      letterSpacing: -0.2,
                      color: ds.textPrimary,
                    ),
                  ),
                ),
                ...actions,
                if (onToggleCollapsed != null)
                  DsIconButton(
                    icon: side == DsPanelSide.right
                        ? Icons.keyboard_double_arrow_right_rounded
                        : Icons.keyboard_double_arrow_left_rounded,
                    label: 'Replier $title',
                    onPressed: onToggleCollapsed,
                  ),
              ],
            ),
          ),
          Divider(color: ds.borderSubtle, height: 1),
          Expanded(child: child),
          if (footer != null)
            Container(
              padding: const EdgeInsets.all(DsSpacing.s5),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: ds.borderSubtle)),
              ),
              child: footer!,
            ),
        ],
      ),
    );
  }
}

enum DsPanelSide { left, right }

/// Titre de section a l'interieur d'un panneau ou d'une page.
class DsSectionTitle extends StatelessWidget {
  const DsSectionTitle(this.label, {this.trailing, this.icon, super.key});

  final String label;
  final Widget? trailing;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    return Row(
      children: [
        if (icon != null) ...[
          DsIcon(icon!, size: 18, color: ds.textTertiary),
          const SizedBox(width: DsSpacing.s2),
        ],
        Expanded(
          child: Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: type.badgeSize,
              fontWeight: DsWeight.semibold,
              letterSpacing: 0.8,
              color: ds.textSecondary,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}
