import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

/// Barre de recherche — **debounce 300 ms** obligatoire (brief §9).
class DsSearchBar extends StatefulWidget {
  const DsSearchBar({
    required this.hintText,
    required this.onChanged,
    this.controller,
    this.debounce = const Duration(milliseconds: 300),
    this.onSubmitted,
    this.trailing,
    this.autofocus = false,
    super.key,
  });

  final String hintText;
  final ValueChanged<String> onChanged;
  final TextEditingController? controller;
  final Duration debounce;
  final ValueChanged<String>? onSubmitted;
  final Widget? trailing;
  final bool autofocus;

  @override
  State<DsSearchBar> createState() => _DsSearchBarState();
}

class _DsSearchBarState extends State<DsSearchBar> {
  late final TextEditingController _controller =
      widget.controller ?? TextEditingController();
  Timer? _debounce;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = _controller.text.isNotEmpty;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    if (widget.controller == null) _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    final has = value.isNotEmpty;
    if (has != _hasText) setState(() => _hasText = has);
    _debounce?.cancel();
    _debounce = Timer(widget.debounce, () => widget.onChanged(value));
  }

  void _clear() {
    _controller.clear();
    _debounce?.cancel();
    setState(() => _hasText = false);
    widget.onChanged('');
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Container(
      constraints: const BoxConstraints(minHeight: DsSpacing.targetMin),
      decoration: BoxDecoration(
        color: ds.surface3,
        borderRadius: DsRadius.mdAll,
        border: Border.all(color: ds.borderDefault),
      ),
      padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s3),
      child: Row(
        children: [
          DsIcon(DsGlyph.search, size: 22, color: ds.textSecondary),
          const SizedBox(width: DsSpacing.s2),
          Expanded(
            child: TextField(
              controller: _controller,
              autofocus: widget.autofocus,
              onChanged: _onChanged,
              onSubmitted: widget.onSubmitted,
              textInputAction: TextInputAction.search,
              style: TextStyle(
                fontSize: context.dsType.bodySize,
                color: ds.textPrimary,
              ),
              decoration: InputDecoration(
                isCollapsed: true,
                border: InputBorder.none,
                filled: false,
                hintText: widget.hintText,
                hintStyle: TextStyle(
                  fontSize: context.dsType.bodySize,
                  color: ds.textTertiary,
                ),
              ),
            ),
          ),
          if (_hasText)
            DsIconButton(
              icon: DsGlyph.close,
              label: 'Effacer la recherche',
              onPressed: _clear,
            ),
          if (widget.trailing != null) widget.trailing!,
        ],
      ),
    );
  }
}
