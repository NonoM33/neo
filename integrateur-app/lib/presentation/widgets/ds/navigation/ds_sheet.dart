import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

/// Detentes d'une sheet iPhone.
enum DsSheetDetent {
  small(0.35),
  medium(0.55),
  large(0.92);

  const DsSheetDetent(this.factor);
  final double factor;
}

/// Sheet du DS.
///
/// Regle de plateforme : **sheet sur iPhone, `DsDialog` sur iPad**.
/// `showDsSheet` applique automatiquement la bonne surface si `adaptive` est vrai.
Future<T?> showDsSheet<T>(
  BuildContext context, {
  required String title,
  required WidgetBuilder builder,
  String? subtitle,
  Widget? footer,
  DsSheetDetent detent = DsSheetDetent.medium,
  bool isScrollControlled = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    useSafeArea: true,
    backgroundColor: context.ds.surface4,
    constraints: const BoxConstraints(maxWidth: 640),
    shape: RoundedRectangleBorder(borderRadius: DsRadius.sheetTop),
    builder: (sheetContext) => DsSheet(
      title: title,
      subtitle: subtitle,
      footer: footer,
      detent: detent,
      child: Builder(builder: builder),
    ),
  );
}

class DsSheet extends StatelessWidget {
  const DsSheet({
    required this.title,
    required this.child,
    this.subtitle,
    this.footer,
    this.detent = DsSheetDetent.medium,
    super.key,
  });

  final String title;
  final Widget child;
  final String? subtitle;
  final Widget? footer;
  final DsSheetDetent detent;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final maxHeight = MediaQuery.sizeOf(context).height * detent.factor;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DsSpacing.s6,
              DsSpacing.s2,
              DsSpacing.s2,
              DsSpacing.s3,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: type.h3Size,
                          fontWeight: DsWeight.semibold,
                          letterSpacing: -0.3,
                          color: ds.textPrimary,
                        ),
                      ),
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: TextStyle(
                            fontSize: type.captionSize,
                            color: ds.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                DsIconButton(
                  icon: DsGlyph.close,
                  label: 'Fermer',
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s6),
              child: child,
            ),
          ),
          if (footer != null)
            Container(
              padding: const EdgeInsets.all(DsSpacing.s6),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: ds.borderSubtle)),
              ),
              child: SafeArea(top: false, child: footer!),
            )
          else
            const SizedBox(height: DsSpacing.s6),
        ],
      ),
    );
  }
}
