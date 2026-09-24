import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../storage/hive_storage.dart';

/// Preferences d'affichage de l'utilisateur.
///
/// - `themeMode` : le sombre est prioritaire dans ce produit (cave, soiree,
///   camionnette) mais reste par defaut aligne sur iOS.
/// - `chantier` : mode chantier — typo, contraste et cibles renforces
///   (corps 17 pt, cibles 56/64 dp), activable en un geste depuis Mon compte.
/// - `autoSync` : synchronisation des qu'un reseau est disponible.
@immutable
class DisplayPreferences {
  const DisplayPreferences({
    this.themeMode = ThemeMode.system,
    this.chantier = false,
    this.autoSync = true,
  });

  final ThemeMode themeMode;
  final bool chantier;
  final bool autoSync;

  DisplayPreferences copyWith({
    ThemeMode? themeMode,
    bool? chantier,
    bool? autoSync,
  }) =>
      DisplayPreferences(
        themeMode: themeMode ?? this.themeMode,
        chantier: chantier ?? this.chantier,
        autoSync: autoSync ?? this.autoSync,
      );
}

class DisplayPreferencesNotifier extends Notifier<DisplayPreferences> {
  @override
  DisplayPreferences build() {
    _restore();
    return const DisplayPreferences();
  }

  static const String _themeKey = 'display.themeMode';
  static const String _chantierKey = 'display.chantier';
  static const String _autoSyncKey = 'display.autoSync';

  Box<dynamic>? _box;

  Future<void> _restore() async {
    try {
      final box = await HiveStorage.getCacheBox();
      _box = box;
      state = DisplayPreferences(
        themeMode: switch (box.get(_themeKey) as String?) {
          'light' => ThemeMode.light,
          'dark' => ThemeMode.dark,
          _ => ThemeMode.system,
        },
        chantier: box.get(_chantierKey) as bool? ?? false,
        autoSync: box.get(_autoSyncKey) as bool? ?? true,
      );
    } on Exception {
      // Les preferences d'affichage ne bloquent jamais le demarrage :
      // en cas de stockage local illisible, on garde les valeurs par defaut.
      state = const DisplayPreferences();
    }
  }

  Future<void> _persist(String key, Object value) async {
    try {
      await _box?.put(key, value);
    } on Exception {
      // Ignore : la preference reste appliquee pour la session en cours.
    }
  }

  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
    _persist(_themeKey, mode.name);
  }

  void setChantier(bool enabled) {
    state = state.copyWith(chantier: enabled);
    _persist(_chantierKey, enabled);
  }

  void setAutoSync(bool enabled) {
    state = state.copyWith(autoSync: enabled);
    _persist(_autoSyncKey, enabled);
  }
}

final displayPreferencesProvider =
    NotifierProvider<DisplayPreferencesNotifier, DisplayPreferences>(
  DisplayPreferencesNotifier.new,
);
