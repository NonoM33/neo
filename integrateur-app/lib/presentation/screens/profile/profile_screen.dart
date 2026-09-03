import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/config/display_preferences.dart';
import '../../../core/di/providers.dart';
import '../../../routes/app_router.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../blocs/sync/sync_bloc.dart';
import '../../widgets/ds/ds.dart';

/// Mon compte — **l'ecran manquant du produit**.
///
/// Identite, synchronisation, affichage (theme et mode chantier), reglages,
/// version, deconnexion. Accessible depuis le pied du rail iPad et depuis
/// « Plus » sur iPhone.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ds = context.ds;
    final device = context.dsDevice;
    final display = ref.watch(displayPreferencesProvider);
    final prefs = ref.read(displayPreferencesProvider.notifier);
    final authBloc = ref.watch(authBlocProvider);
    final authState = authBloc.state;
    final user = authState is AuthAuthenticated ? authState.user : null;
    final syncBloc = ref.watch(syncBlocProvider);

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      appBar: DsAppBar(
        title: 'Mon compte',
        onBack: device.isPhone ? () => context.goToDashboard() : null,
        backLabel: 'Retour au tableau de bord',
      ),
      body: ListView(
        padding: DsSpacing.page(device),
        children: [
          _Identity(name: user?.fullName, role: user?.role.displayName),
          const SizedBox(height: DsSpacing.gapSection),

          const DsSectionTitle('Synchronisation'),
          const SizedBox(height: DsSpacing.s2),
          StreamBuilder<SyncState>(
            stream: syncBloc.stream,
            initialData: syncBloc.state,
            builder: (context, snapshot) {
              final sync = snapshot.data;
              final (DsSyncState state, int pending, String? last) =
                  switch (sync) {
                SyncInProgress() => (DsSyncState.syncing, 0, null),
                SyncFailed(message: final m) => (DsSyncState.failed, 0, m),
                SyncIdle(isOnline: false) => (DsSyncState.offline, 0, null),
                SyncIdle(pendingUploads: final p) when p > 0 => (
                    DsSyncState.pending,
                    p,
                    'Ils partiront à la reconnexion',
                  ),
                _ => (DsSyncState.online, 0, null),
              };
              return DsSyncIndicator(
                state: state,
                pending: pending,
                lastSync: last,
                expanded: true,
                onTap: () => syncBloc.add(const SyncRequested()),
              );
            },
          ),
          const SizedBox(height: DsSpacing.s2),
          _SettingsGroup(
            children: [
              DsToggle(
                label: 'Synchronisation automatique',
                description: 'Dès qu’un réseau est disponible',
                value: display.autoSync,
                onChanged: prefs.setAutoSync,
                icon: DsGlyph.sync,
              ),
            ],
          ),
          const SizedBox(height: DsSpacing.gapSection),

          const DsSectionTitle('Affichage'),
          const SizedBox(height: DsSpacing.s2),
          _SettingsGroup(
            children: [
              DsToggle(
                label: 'Thème sombre',
                description: display.themeMode == ThemeMode.system
                    ? 'Automatique selon iOS'
                    : 'Forcé sur cet appareil',
                value: display.themeMode == ThemeMode.dark ||
                    (display.themeMode == ThemeMode.system &&
                        Theme.of(context).brightness == Brightness.dark),
                icon: Icons.dark_mode_rounded,
                onChanged: (value) => prefs.setThemeMode(
                  value ? ThemeMode.dark : ThemeMode.light,
                ),
              ),
              DsToggle(
                label: 'Mode chantier',
                description: 'Contraste, typographie et cibles renforcés',
                value: display.chantier,
                icon: Icons.construction_rounded,
                onChanged: prefs.setChantier,
              ),
            ],
          ),
          const SizedBox(height: DsSpacing.gapSection),

          const DsSectionTitle('Réglages'),
          const SizedBox(height: DsSpacing.s2),
          _SettingRow(
            icon: DsGlyph.eventAvailable,
            label: 'Mes disponibilités',
            onTap: () => context.goToAvailability(),
          ),
          const SizedBox(height: DsSpacing.s2),
          _SettingRow(
            icon: DsGlyph.home,
            label: 'Connexion Home Assistant',
            onTap: () => context.goToHomes(),
          ),
          const SizedBox(height: DsSpacing.s2),
          _SettingRow(
            icon: DsGlyph.info,
            label: 'Version',
            value: AppConfig.appVersion,
          ),
          const SizedBox(height: DsSpacing.gapSection),

          DsButton(
            label: 'Déconnexion',
            variant: DsButtonVariant.danger,
            size: DsButtonSize.large,
            icon: Icons.logout_rounded,
            fullWidth: true,
            onPressed: () async {
              final confirmed = await showDsConfirmDialog(
                context,
                title: 'Se déconnecter ?',
                description:
                    'Les saisies non synchronisées restent enregistrées sur cet appareil.',
                confirmLabel: 'Se déconnecter',
              );
              if (!confirmed || !context.mounted) return;
              authBloc.add(const AuthLogoutRequested());
              context.goToLogin();
            },
          ),
          const SizedBox(height: DsSpacing.s6),
        ],
      ),
    );
  }
}

class _Identity extends StatelessWidget {
  const _Identity({this.name, this.role});

  final String? name;
  final String? role;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final initials = () {
      final value = (name ?? '').trim();
      if (value.isEmpty) return 'NI';
      return value
          .split(RegExp(r'\s+'))
          .take(2)
          .map((part) => part[0])
          .join()
          .toUpperCase();
    }();

    return DsCard(
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: ds.brandSecondarySoft,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              initials,
              style: TextStyle(
                fontSize: t.h3Size,
                fontWeight: DsWeight.semibold,
                color: ds.brandSecondary,
              ),
            ),
          ),
          const SizedBox(width: DsSpacing.s4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name ?? 'Utilisateur',
                  style: TextStyle(
                    fontSize: t.h3Size,
                    fontWeight: DsWeight.semibold,
                    letterSpacing: -0.3,
                    color: ds.textPrimary,
                  ),
                ),
                if (role != null) ...[
                  const SizedBox(height: 4),
                  DsStatusBadge(status: DsStatus.enCours, label: role),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return DsCard(
      padding: const EdgeInsets.symmetric(
        horizontal: DsSpacing.s3,
        vertical: DsSpacing.s1,
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) Divider(color: ds.borderSubtle, height: 1),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({
    required this.icon,
    required this.label,
    this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return DsCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(
        horizontal: DsSpacing.cardPadding,
        vertical: DsSpacing.s3,
      ),
      child: Row(
        children: [
          DsIcon(icon, size: 22, color: ds.textTertiary),
          const SizedBox(width: DsSpacing.s3),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: t.bodySize, color: ds.textBody),
            ),
          ),
          if (value != null)
            Text(
              value!,
              style: TextStyle(
                fontSize: t.captionSize,
                color: ds.textSecondary,
              ),
            ),
          if (onTap != null) ...[
            const SizedBox(width: DsSpacing.s2),
            DsIcon(DsGlyph.chevronRight, size: 22, color: ds.textTertiary),
          ],
        ],
      ),
    );
  }
}
