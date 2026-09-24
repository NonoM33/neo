import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';

/// Enveloppe tactile du DS : `scale(0.97)` en 160 ms + voile presse.
///
/// Pas de rebond, pas d'elastique. Neutralise si `prefers-reduced-motion`.
class DsPressable extends StatefulWidget {
  const DsPressable({
    required this.child,
    this.onTap,
    this.onLongPress,
    this.borderRadius,
    this.semanticLabel,
    this.enableFeedback = true,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final BorderRadius? borderRadius;
  final String? semanticLabel;
  final bool enableFeedback;

  @override
  State<DsPressable> createState() => _DsPressableState();
}

class _DsPressableState extends State<DsPressable> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null || widget.onLongPress != null;
    final radius = widget.borderRadius ?? DsRadius.cardAll;

    Widget content = AnimatedScale(
      scale: _pressed ? DsMotion.pressScaleOf(context) : 1,
      duration: DsMotion.duration(context, DsMotion.exit),
      curve: DsMotion.easeExit,
      child: widget.child,
    );

    if (!enabled) return content;

    return Semantics(
      button: true,
      label: widget.semanticLabel,
      child: GestureDetector(
        onTapDown: (_) => _setPressed(true),
        onTapUp: (_) => _setPressed(false),
        onTapCancel: () => _setPressed(false),
        child: Material(
          color: Colors.transparent,
          borderRadius: radius,
          child: InkWell(
            onTap: widget.onTap,
            onLongPress: widget.onLongPress,
            borderRadius: radius,
            enableFeedback: widget.enableFeedback,
            hoverColor: context.ds.hoverOverlay,
            highlightColor: context.ds.pressedOverlay,
            splashColor: context.ds.pressedOverlay,
            child: content,
          ),
        ),
      ),
    );
  }
}
