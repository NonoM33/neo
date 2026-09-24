import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Etats de synchronisation. Le hors-ligne est un etat **normal**, pas une erreur.
enum DsSyncState {
  online,
  offline,
  syncing,
  pending,
  failed;

  IconData get icon => switch (this) {
        DsSyncState.online => DsGlyph.cloudDone,
        DsSyncState.offline => DsGlyph.cloudOff,
        DsSyncState.syncing => DsGlyph.sync,
        DsSyncState.pending => DsGlyph.cloudUpload,
        DsSyncState.failed => DsGlyph.syncProblem,
      };

  Color color(DsColors ds) => switch (this) {
        DsSyncState.online => ds.syncOnline,
        DsSyncState.offline => ds.syncOffline,
        DsSyncState.syncing => ds.syncPending,
        DsSyncState.pending => ds.syncPending,
        DsSyncState.failed => ds.syncFailed,
      };

  String label([int pending = 0]) => switch (this) {
        DsSyncState.online => 'Synchronisé',
        DsSyncState.offline => 'Hors ligne',
        DsSyncState.syncing => 'Synchronisation…',
        DsSyncState.pending => '$pending en attente',
        DsSyncState.failed => 'Échec de synchro',
      };
}

/// Indicateur de synchronisation — visible en permanence (rail iPad ET app bar iPhone).
class DsSyncIndicator extends StatefulWidget {
  const DsSyncIndicator({
    required this.state,
    this.pending = 0,
    this.lastSync,
    this.expanded = false,
    this.onTap,
    super.key,
  });

  final DsSyncState state;
  final int pending;

  /// Ex. « il y a 4 min ».
  final String? lastSync;
  final bool expanded;
  final VoidCallback? onTap;

  @override
  State<DsSyncIndicator> createState() => _DsSyncIndicatorState();
}

class _DsSyncIndicatorState extends State<DsSyncIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _spin = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void initState() {
    super.initState();
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant DsSyncIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncAnimation();
  }

  void _syncAnimation() {
    if (widget.state == DsSyncState.syncing) {
      if (!_spin.isAnimating) _spin.repeat();
    } else {
      _spin.stop();
      _spin.value = 0;
    }
  }

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final color = widget.state.color(ds);
    final label = widget.state.label(widget.pending);

    final glyph = RotationTransition(
      turns: _spin,
      child: DsIcon(widget.state.icon, size: 22, color: color),
    );

    return Semantics(
      button: widget.onTap != null,
      label: widget.lastSync == null ? label : '$label, ${widget.lastSync}',
      child: Tooltip(
        message: widget.lastSync == null ? label : '$label · ${widget.lastSync}',
        child: Material(
          color: ds.soft(color, 0.12),
          borderRadius: DsRadius.mdAll,
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: DsRadius.mdAll,
            child: Container(
              constraints: const BoxConstraints(
                minHeight: DsSpacing.targetMin,
                minWidth: DsSpacing.targetMin,
              ),
              padding: EdgeInsets.symmetric(
                horizontal: widget.expanded ? DsSpacing.s3 : 0,
              ),
              decoration: BoxDecoration(
                borderRadius: DsRadius.mdAll,
                border: Border.all(color: ds.softBorder(color, 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: widget.expanded
                    ? MainAxisAlignment.start
                    : MainAxisAlignment.center,
                children: [
                  if (widget.expanded)
                    glyph
                  else
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        glyph,
                        if (widget.pending > 0)
                          Positioned(
                            top: -6,
                            right: -8,
                            child: Container(
                              constraints: const BoxConstraints(minWidth: 18),
                              height: 18,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 5),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: ds.brandTertiary,
                                borderRadius: DsRadius.fullAll,
                              ),
                              child: Text(
                                '${widget.pending}',
                                style: TextStyle(
                                  fontSize: type.badgeSize,
                                  fontWeight: DsWeight.semibold,
                                  color: Colors.white,
                                  height: 1,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  if (widget.expanded) ...[
                    const SizedBox(width: DsSpacing.s2),
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: type.labelSize,
                              fontWeight: DsWeight.semibold,
                              color: color,
                              height: 1.25,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (widget.lastSync != null)
                            Text(
                              widget.lastSync!,
                              style: TextStyle(
                                fontSize: type.badgeSize,
                                color: ds.textSecondary,
                                height: 1.25,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
