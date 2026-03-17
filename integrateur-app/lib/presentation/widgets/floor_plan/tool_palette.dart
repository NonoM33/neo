import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/floor_plan.dart';

/// Vertical tool palette for the floor plan editor
class ToolPalette extends StatelessWidget {
  final PlanTool activeTool;
  final PlanViewMode viewMode;
  final ValueChanged<PlanTool> onToolSelected;

  const ToolPalette({
    super.key,
    required this.activeTool,
    required this.viewMode,
    required this.onToolSelected,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 80,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        border: Border(
          right: BorderSide(
            color: colorScheme.outlineVariant.withAlpha(40),
          ),
        ),
      ),
      child: SafeArea(
        right: false,
        child: Column(
          children: [
            AppSpacing.vGapSm,
            _ToolButton(
              icon: Icons.near_me,
              label: 'Sélection',
              tool: PlanTool.select,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.select),
            ),
            const Divider(height: 16, indent: 12, endIndent: 12),
            _ToolButton(
              icon: Icons.horizontal_rule,
              label: 'Mur',
              tool: PlanTool.wall,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.wall),
            ),
            _ToolButton(
              icon: Icons.door_front_door_outlined,
              label: 'Porte',
              tool: PlanTool.door,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.door),
            ),
            _ToolButton(
              icon: Icons.window_outlined,
              label: 'Fenêtre',
              tool: PlanTool.window,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.window),
            ),
            const Divider(height: 16, indent: 12, endIndent: 12),
            _ToolButton(
              icon: Icons.router,
              label: 'Équipement',
              tool: PlanTool.equipment,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.equipment),
            ),
            _ToolButton(
              icon: Icons.note_add_outlined,
              label: 'Note',
              tool: PlanTool.annotation,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.annotation),
            ),
            _ToolButton(
              icon: Icons.straighten,
              label: 'Mesure',
              tool: PlanTool.measurement,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.measurement),
            ),
            const Divider(height: 16, indent: 12, endIndent: 12),
            _ToolButton(
              icon: Icons.delete_outline,
              label: 'Gomme',
              tool: PlanTool.eraser,
              activeTool: activeTool,
              onTap: () => _selectTool(PlanTool.eraser),
              isDestructive: true,
            ),
          ],
        ),
      ),
    );
  }

  void _selectTool(PlanTool tool) {
    HapticFeedback.selectionClick();
    onToolSelected(tool);
  }
}

class _ToolButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final PlanTool tool;
  final PlanTool activeTool;
  final VoidCallback onTap;
  final bool isDestructive;

  const _ToolButton({
    required this.icon,
    required this.label,
    required this.tool,
    required this.activeTool,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isActive = tool == activeTool;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Tooltip(
        message: label,
        preferBelow: false,
        child: Material(
          color: isActive
              ? colorScheme.primaryContainer
              : Colors.transparent,
          borderRadius: AppRadius.borderRadiusMd,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadius.borderRadiusMd,
            child: SizedBox(
              width: 56,
              height: 56,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    size: 22,
                    color: isActive
                        ? colorScheme.onPrimaryContainer
                        : isDestructive
                            ? colorScheme.error
                            : colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                      color: isActive
                          ? colorScheme.onPrimaryContainer
                          : colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
