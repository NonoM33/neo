import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

/// Outils du plan de piece.
enum DsPlanTool {
  select('Sélection', Icons.near_me_rounded),
  wall('Mur', Icons.horizontal_rule_rounded),
  door('Porte', Icons.sensor_door_rounded),
  window('Fenêtre', Icons.window_rounded),
  equipment('Équipement', Icons.settings_input_component_rounded),
  measure('Mesure', DsGlyph.ruler),
  note('Note', DsGlyph.note),
  eraser('Gomme', Icons.cleaning_services_rounded);

  const DsPlanTool(this.label, this.icon);
  final String label;
  final IconData icon;
}

/// Palette d'outils du plan — flottante, ombre `elevation-floating`.
///
/// C'est l'une des rares couches du systeme qui porte une vraie ombre :
/// elle doit se detacher du contenu client.
class DsPlanToolbar extends StatelessWidget {
  const DsPlanToolbar({
    required this.activeTool,
    required this.onSelectTool,
    this.orientation = Axis.vertical,
    this.canUndo = false,
    this.canRedo = false,
    this.onUndo,
    this.onRedo,
    this.showGrid = true,
    this.onToggleGrid,
    super.key,
  });

  final DsPlanTool activeTool;
  final ValueChanged<DsPlanTool> onSelectTool;
  final Axis orientation;
  final bool canUndo;
  final bool canRedo;
  final VoidCallback? onUndo;
  final VoidCallback? onRedo;
  final bool showGrid;
  final VoidCallback? onToggleGrid;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;

    final children = <Widget>[
      for (final tool in DsPlanTool.values)
        DsIconButton(
          icon: tool.icon,
          label: tool.label,
          active: tool == activeTool,
          filled: tool == activeTool,
          onPressed: () => onSelectTool(tool),
        ),
      Padding(
        padding: EdgeInsets.symmetric(
          horizontal: orientation == Axis.vertical ? DsSpacing.s2 : DsSpacing.s1,
          vertical: orientation == Axis.vertical ? DsSpacing.s1 : DsSpacing.s2,
        ),
        child: orientation == Axis.vertical
            ? Divider(color: ds.borderSubtle, height: 1)
            : VerticalDivider(color: ds.borderSubtle, width: 1),
      ),
      DsIconButton(
        icon: Icons.undo_rounded,
        label: 'Annuler',
        onPressed: canUndo ? onUndo : null,
      ),
      DsIconButton(
        icon: Icons.redo_rounded,
        label: 'Rétablir',
        onPressed: canRedo ? onRedo : null,
      ),
      DsIconButton(
        icon: Icons.grid_4x4_rounded,
        label: 'Grille 25 cm',
        active: showGrid,
        onPressed: onToggleGrid,
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(DsSpacing.s1),
      decoration: BoxDecoration(
        color: ds.surface3,
        borderRadius: DsRadius.lgAll,
        border: Border.all(color: ds.borderSubtle),
        boxShadow: ds.elevationFloating,
      ),
      child: orientation == Axis.vertical
          ? Column(mainAxisSize: MainAxisSize.min, children: children)
          : Row(mainAxisSize: MainAxisSize.min, children: children),
    );
  }
}
