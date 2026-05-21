import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../domain/entities/checklist_item.dart';
import '../../../../domain/entities/room.dart';

/// Icon for a room type — used in lists, sheets, and detail headers.
IconData roomIcon(RoomType type) {
  switch (type) {
    case RoomType.salon:
      return Icons.weekend_outlined;
    case RoomType.cuisine:
      return Icons.kitchen_outlined;
    case RoomType.chambre:
      return Icons.bed_outlined;
    case RoomType.salleDeBain:
      return Icons.bathtub_outlined;
    case RoomType.bureau:
      return Icons.desk_outlined;
    case RoomType.garage:
      return Icons.garage_outlined;
    case RoomType.exterieur:
      return Icons.park_outlined;
    case RoomType.autre:
      return Icons.room_outlined;
  }
}

/// Icon for a checklist category.
IconData catIcon(ChecklistCategory cat) {
  switch (cat) {
    case ChecklistCategory.eclairage:
      return Icons.lightbulb_outlined;
    case ChecklistCategory.ouvrants:
      return Icons.sensor_window_outlined;
    case ChecklistCategory.climat:
      return Icons.thermostat_outlined;
    case ChecklistCategory.securite:
      return Icons.security_outlined;
    case ChecklistCategory.energie:
      return Icons.bolt_outlined;
    case ChecklistCategory.multimedia:
      return Icons.tv_outlined;
    case ChecklistCategory.infrastructure:
      return Icons.electrical_services_outlined;
    case ChecklistCategory.reseau:
      return Icons.wifi_outlined;
    case ChecklistCategory.chauffage:
      return Icons.local_fire_department_outlined;
    case ChecklistCategory.autre:
      return Icons.category_outlined;
  }
}

/// Brand color for a checklist category.
Color catColor(ChecklistCategory cat, ColorScheme cs) {
  switch (cat) {
    case ChecklistCategory.eclairage:
      return AppTheme.warningColor;
    case ChecklistCategory.ouvrants:
      return AppTheme.statusEnCours;
    case ChecklistCategory.climat:
      return AppTheme.secondaryColor;
    case ChecklistCategory.securite:
      return AppTheme.errorColor;
    case ChecklistCategory.energie:
      return AppTheme.tertiaryColor;
    case ChecklistCategory.multimedia:
      return AppTheme.statusBrouillon;
    case ChecklistCategory.infrastructure:
      return cs.onSurfaceVariant;
    case ChecklistCategory.reseau:
      return AppTheme.statusEnCours;
    case ChecklistCategory.chauffage:
      return AppTheme.tertiaryColor;
    case ChecklistCategory.autre:
      return AppTheme.statusArchive;
  }
}

/// Color reflecting completion progress: archive / warning / en cours / success.
Color progressColor(double p) {
  if (p <= 0) return AppTheme.statusArchive;
  if (p < 0.4) return AppTheme.warningColor;
  if (p < 0.8) return AppTheme.statusEnCours;
  return AppTheme.successColor;
}
