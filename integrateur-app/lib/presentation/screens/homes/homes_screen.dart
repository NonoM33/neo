import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/ha_device.dart';
import '../../blocs/homes/homes_bloc.dart';
import '../../blocs/homes/homes_event.dart';
import '../../blocs/homes/homes_state.dart';

/// Ma Maison - Home control screen with real-time device management
class HomesScreen extends ConsumerStatefulWidget {
  const HomesScreen({super.key});

  @override
  ConsumerState<HomesScreen> createState() => _HomesScreenState();
}

class _HomesScreenState extends ConsumerState<HomesScreen> {
  final _urlController = TextEditingController();
  final _tokenController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _urlController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final homesBloc = ref.watch(homesBlocProvider);

    return BlocProvider.value(
      value: homesBloc,
      child: BlocBuilder<HomesBloc, HomesState>(
        builder: (context, state) {
          return Scaffold(
            body: switch (state) {
              HomesInitial() => _buildConnectionForm(context),
              HomesConnecting() => _buildConnectingState(context),
              HomesConnected() =>
                _buildConnectedView(context, state),
              HomesDisconnected() =>
                _buildConnectionForm(context, reason: state.reason),
              HomesError() =>
                _buildConnectionForm(context, error: state.message),
            },
          );
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Connection form
  // ---------------------------------------------------------------------------

  Widget _buildConnectionForm(
    BuildContext context, {
    String? reason,
    String? error,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: SingleChildScrollView(
        padding: AppSpacing.pagePadding,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer,
                    borderRadius: AppRadius.borderRadiusXl,
                  ),
                  child: Icon(
                    Icons.home_rounded,
                    size: 40,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
                AppSpacing.vGapLg,

                Text(
                  'Ma Maison',
                  style: textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                AppSpacing.vGapSm,
                Text(
                  'Connectez-vous a votre serveur domotique pour controler vos appareils en temps reel.',
                  style: textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                AppSpacing.vGapXl,

                // Error / reason message
                if (error != null || reason != null) ...[
                  _buildAlertBanner(
                    context,
                    message: error ?? reason!,
                    isError: error != null,
                  ),
                  AppSpacing.vGapMd,
                ],

                // URL field
                TextFormField(
                  controller: _urlController,
                  decoration: const InputDecoration(
                    labelText: 'URL du serveur',
                    hintText: 'http://192.168.1.100:8123',
                    prefixIcon: Icon(Icons.dns_outlined),
                  ),
                  keyboardType: TextInputType.url,
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Veuillez saisir l\'URL du serveur';
                    }
                    if (!value.startsWith('http://') &&
                        !value.startsWith('https://')) {
                      return 'L\'URL doit commencer par http:// ou https://';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.formFieldSpacing),

                // Token field
                TextFormField(
                  controller: _tokenController,
                  decoration: const InputDecoration(
                    labelText: 'Token d\'acces',
                    hintText: 'eyJ...',
                    prefixIcon: Icon(Icons.vpn_key_outlined),
                  ),
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Veuillez saisir le token d\'acces';
                    }
                    return null;
                  },
                  onFieldSubmitted: (_) => _connect(context),
                ),
                AppSpacing.vGapLg,

                // Connect button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _connect(context),
                    icon: const Icon(Icons.power_settings_new),
                    label: const Text('Se connecter'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(120, 52),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAlertBanner(
    BuildContext context, {
    required String message,
    bool isError = false,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final bgColor = isError
        ? colorScheme.errorContainer
        : colorScheme.tertiaryContainer;
    final fgColor = isError
        ? colorScheme.onErrorContainer
        : colorScheme.onTertiaryContainer;

    return Container(
      width: double.infinity,
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.borderRadiusMd,
      ),
      child: Row(
        children: [
          Icon(
            isError
                ? Icons.error_outline
                : Icons.info_outline,
            color: fgColor,
          ),
          AppSpacing.hGapSm,
          Expanded(
            child: Text(
              message,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: fgColor),
            ),
          ),
        ],
      ),
    );
  }

  void _connect(BuildContext context) {
    if (_formKey.currentState?.validate() != true) return;

    HapticFeedback.lightImpact();
    context.read<HomesBloc>().add(
          HomesConnectRequested(
            url: _urlController.text.trim(),
            token: _tokenController.text.trim(),
          ),
        );
  }

  // ---------------------------------------------------------------------------
  // Connecting state
  // ---------------------------------------------------------------------------

  Widget _buildConnectingState(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: colorScheme.primary,
            ),
          ),
          AppSpacing.vGapLg,
          Text(
            'Connexion en cours...',
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          AppSpacing.vGapSm,
          Text(
            'Authentification aupres du serveur domotique',
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Connected view with device groups
  // ---------------------------------------------------------------------------

  Widget _buildConnectedView(
    BuildContext context,
    HomesConnected state,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: () async {
        final bloc = context.read<HomesBloc>();
        bloc.add(const HomesDisconnectRequested());
        await Future.delayed(const Duration(milliseconds: 300));
        bloc.add(HomesConnectRequested(
          url: _urlController.text.trim(),
          token: _tokenController.text.trim(),
        ));
      },
      child: CustomScrollView(
        slivers: [
          // App bar
          SliverAppBar(
            pinned: true,
            expandedHeight: 120,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsetsDirectional.only(
                start: 32,
                bottom: 16,
              ),
              title: Text(
                'Ma Maison',
                style: textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
            ),
            actions: [
              // Disconnect button
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: IconButton(
                  icon: const Icon(Icons.power_settings_new),
                  tooltip: 'Deconnecter',
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context
                        .read<HomesBloc>()
                        .add(const HomesDisconnectRequested());
                  },
                ),
              ),
            ],
          ),

          // Status summary
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.md,
              ),
              child: _buildStatusSummary(
                context,
                state,
                isDark,
              ),
            ),
          ),

          // Device groups
          if (state.devices.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _buildEmptyDevices(context),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
              ),
              sliver: SliverList(
                delegate: SliverChildListDelegate(
                  _buildDomainSections(
                    context,
                    state,
                    isDark,
                  ),
                ),
              ),
            ),

          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: AppSpacing.xl),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Status summary cards
  // ---------------------------------------------------------------------------

  Widget _buildStatusSummary(
    BuildContext context,
    HomesConnected state,
    bool isDark,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        _buildStatCard(
          context,
          icon: Icons.devices_other,
          label: 'Appareils',
          value: '${state.totalDevices}',
          color: colorScheme.primary,
          isDark: isDark,
        ),
        AppSpacing.hGapMd,
        _buildStatCard(
          context,
          icon: Icons.wifi,
          label: 'En ligne',
          value: '${state.onlineDevices}',
          color: colorScheme.secondary,
          isDark: isDark,
        ),
        AppSpacing.hGapMd,
        _buildStatCard(
          context,
          icon: Icons.power,
          label: 'Actifs',
          value: '${state.activeDevices}',
          color: colorScheme.tertiary,
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required Color color,
    required bool isDark,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Expanded(
      child: Container(
        padding: AppSpacing.cardPadding,
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: AppRadius.borderRadiusLg,
          border: Border.all(
            color: isDark
                ? Colors.white.withAlpha(15)
                : colorScheme.outlineVariant.withAlpha(40),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            AppSpacing.vGapSm,
            Text(
              value,
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  Widget _buildEmptyDevices(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.devices_other_outlined,
            size: 64,
            color: colorScheme.onSurfaceVariant.withAlpha(120),
          ),
          AppSpacing.vGapMd,
          Text(
            'Aucun appareil detecte',
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          AppSpacing.vGapSm,
          Text(
            'Verifiez que vos appareils sont bien configures sur votre serveur domotique.',
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Domain sections
  // ---------------------------------------------------------------------------

  static const _domainOrder = [
    'light',
    'switch',
    'climate',
    'cover',
    'alarm_control_panel',
    'fan',
    'lock',
    'media_player',
    'camera',
    'sensor',
    'binary_sensor',
    'scene',
  ];

  static const _domainLabels = {
    'light': 'Lumieres',
    'switch': 'Interrupteurs',
    'climate': 'Climatisation',
    'cover': 'Volets / Stores',
    'alarm_control_panel': 'Alarme',
    'fan': 'Ventilateurs',
    'lock': 'Serrures',
    'media_player': 'Media',
    'camera': 'Cameras',
    'sensor': 'Capteurs',
    'binary_sensor': 'Detecteurs',
    'scene': 'Scenes',
  };

  static const _domainIcons = {
    'light': Icons.lightbulb_outlined,
    'switch': Icons.toggle_on_outlined,
    'climate': Icons.thermostat_outlined,
    'cover': Icons.blinds_outlined,
    'alarm_control_panel': Icons.security_outlined,
    'fan': Icons.air_outlined,
    'lock': Icons.lock_outlined,
    'media_player': Icons.speaker_outlined,
    'camera': Icons.videocam_outlined,
    'sensor': Icons.sensors_outlined,
    'binary_sensor': Icons.notifications_outlined,
    'scene': Icons.auto_fix_high_outlined,
  };

  List<Widget> _buildDomainSections(
    BuildContext context,
    HomesConnected state,
    bool isDark,
  ) {
    final sections = <Widget>[];

    for (final domain in _domainOrder) {
      final devices = state.devicesByDomain[domain];
      if (devices == null || devices.isEmpty) continue;

      sections.add(
        _DomainSection(
          domain: domain,
          label: _domainLabels[domain] ?? domain,
          icon: _domainIcons[domain] ?? Icons.device_unknown,
          devices: devices,
          isDark: isDark,
        ),
      );
    }

    // Any remaining domains not in the ordered list
    for (final entry in state.devicesByDomain.entries) {
      if (!_domainOrder.contains(entry.key)) {
        sections.add(
          _DomainSection(
            domain: entry.key,
            label: entry.key,
            icon: Icons.device_unknown,
            devices: entry.value,
            isDark: isDark,
          ),
        );
      }
    }

    return sections;
  }
}

// =============================================================================
// Domain section widget
// =============================================================================

class _DomainSection extends StatelessWidget {
  final String domain;
  final String label;
  final IconData icon;
  final List<HaDevice> devices;
  final bool isDark;

  const _DomainSection({
    required this.domain,
    required this.label,
    required this.icon,
    required this.devices,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final activeCount = devices.where((d) => d.isOn).length;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Padding(
            padding: const EdgeInsets.only(
              bottom: AppSpacing.sm,
              left: AppSpacing.xs,
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: colorScheme.primary,
                ),
                AppSpacing.hGapSm,
                Text(
                  label,
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                AppSpacing.hGapSm,
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer.withAlpha(80),
                    borderRadius: AppRadius.borderRadiusFull,
                  ),
                  child: Text(
                    activeCount > 0
                        ? '$activeCount/${devices.length}'
                        : '${devices.length}',
                    style: textTheme.labelSmall?.copyWith(
                      color: colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Device cards grid
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount =
                  (constraints.maxWidth / 320).floor().clamp(1, 4);

              return Wrap(
                spacing: AppSpacing.cardGap,
                runSpacing: AppSpacing.cardGap,
                children: devices.map((device) {
                  final cardWidth =
                      (constraints.maxWidth -
                              (crossAxisCount - 1) *
                                  AppSpacing.cardGap) /
                          crossAxisCount;

                  return SizedBox(
                    width: cardWidth,
                    child: _buildDeviceCard(
                      context,
                      device,
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceCard(BuildContext context, HaDevice device) {
    switch (domain) {
      case 'light':
        return _LightDeviceCard(device: device, isDark: isDark);
      case 'climate':
        return _ClimateDeviceCard(device: device, isDark: isDark);
      case 'cover':
        return _CoverDeviceCard(device: device, isDark: isDark);
      case 'sensor':
      case 'binary_sensor':
        return _SensorDeviceCard(device: device, isDark: isDark);
      default:
        return _ToggleDeviceCard(device: device, isDark: isDark);
    }
  }
}

// =============================================================================
// Device card base
// =============================================================================

class _DeviceCardContainer extends StatelessWidget {
  final HaDevice device;
  final bool isDark;
  final Widget child;
  const _DeviceCardContainer({
    required this.device,
    required this.isDark,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: AppRadius.borderRadiusLg,
          border: Border.all(
            color: device.isOn
                ? colorScheme.primary.withAlpha(60)
                : isDark
                    ? Colors.white.withAlpha(15)
                    : colorScheme.outlineVariant.withAlpha(40),
          ),
        ),
        child: InkWell(
          onTap: null,
          borderRadius: AppRadius.borderRadiusLg,
          child: Padding(
            padding: AppSpacing.cardPadding,
            child: child,
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Toggle device card (switches, locks, fans, scenes, etc.)
// =============================================================================

class _ToggleDeviceCard extends StatelessWidget {
  final HaDevice device;
  final bool isDark;

  const _ToggleDeviceCard({
    required this.device,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return _DeviceCardContainer(
      device: device,
      isDark: isDark,
      child: Row(
        children: [
          // State indicator
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: device.isUnavailable
                  ? colorScheme.onSurfaceVariant.withAlpha(60)
                  : device.isOn
                      ? colorScheme.primary
                      : colorScheme.onSurfaceVariant.withAlpha(100),
            ),
          ),
          AppSpacing.hGapSm,

          // Name + state
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  device.friendlyName,
                  style: textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  _stateLabel(device),
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          // Toggle
          if (!device.isUnavailable)
            Switch(
              value: device.isOn,
              onChanged: (value) {
                HapticFeedback.selectionClick();
                context.read<HomesBloc>().add(
                      HomesToggleDevice(
                        entityId: device.entityId,
                        domain: device.domain,
                        turnOn: value,
                      ),
                    );
              },
            ),
        ],
      ),
    );
  }

  String _stateLabel(HaDevice device) {
    if (device.isUnavailable) return 'Indisponible';
    return device.isOn ? 'Allume' : 'Eteint';
  }
}

// =============================================================================
// Light device card (toggle + brightness slider)
// =============================================================================

class _LightDeviceCard extends StatelessWidget {
  final HaDevice device;
  final bool isDark;

  const _LightDeviceCard({
    required this.device,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final brightnessPercent = device.brightness != null
        ? (device.brightness! / 255 * 100).round()
        : null;

    return _DeviceCardContainer(
      device: device,
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              // Light icon
              Icon(
                device.isOn
                    ? Icons.lightbulb
                    : Icons.lightbulb_outline,
                color: device.isOn
                    ? colorScheme.tertiary
                    : colorScheme.onSurfaceVariant,
                size: 24,
              ),
              AppSpacing.hGapSm,

              // Name + brightness
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.friendlyName,
                      style: textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      device.isUnavailable
                          ? 'Indisponible'
                          : device.isOn
                              ? brightnessPercent != null
                                  ? '$brightnessPercent%'
                                  : 'Allume'
                              : 'Eteint',
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              // Toggle
              if (!device.isUnavailable)
                Switch(
                  value: device.isOn,
                  onChanged: (value) {
                    HapticFeedback.selectionClick();
                    context.read<HomesBloc>().add(
                          HomesToggleDevice(
                            entityId: device.entityId,
                            domain: device.domain,
                            turnOn: value,
                          ),
                        );
                  },
                ),
            ],
          ),

          // Brightness slider
          if (device.isOn && device.brightness != null) ...[
            AppSpacing.vGapSm,
            Row(
              children: [
                Icon(
                  Icons.brightness_low,
                  size: 16,
                  color: colorScheme.onSurfaceVariant,
                ),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight: 4,
                      thumbShape: const RoundSliderThumbShape(
                        enabledThumbRadius: 8,
                      ),
                      overlayShape: const RoundSliderOverlayShape(
                        overlayRadius: 20,
                      ),
                    ),
                    child: Slider(
                      value: device.brightness!.toDouble(),
                      min: 0,
                      max: 255,
                      onChanged: (value) {
                        context.read<HomesBloc>().add(
                              HomesSetBrightness(
                                entityId: device.entityId,
                                brightness: value.round(),
                              ),
                            );
                      },
                      onChangeEnd: (_) {
                        HapticFeedback.selectionClick();
                      },
                    ),
                  ),
                ),
                Icon(
                  Icons.brightness_high,
                  size: 16,
                  color: colorScheme.onSurfaceVariant,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Climate device card (temperature display + set buttons)
// =============================================================================

class _ClimateDeviceCard extends StatelessWidget {
  final HaDevice device;
  final bool isDark;

  const _ClimateDeviceCard({
    required this.device,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final targetTemp = device.temperature;
    final currentTemp = device.currentTemperature;

    return _DeviceCardContainer(
      device: device,
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                Icons.thermostat,
                color: device.isOn
                    ? colorScheme.secondary
                    : colorScheme.onSurfaceVariant,
                size: 24,
              ),
              AppSpacing.hGapSm,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.friendlyName,
                      style: textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      device.isUnavailable
                          ? 'Indisponible'
                          : device.state,
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              // Toggle
              if (!device.isUnavailable)
                Switch(
                  value: device.isOn,
                  onChanged: (value) {
                    HapticFeedback.selectionClick();
                    context.read<HomesBloc>().add(
                          HomesToggleDevice(
                            entityId: device.entityId,
                            domain: device.domain,
                            turnOn: value,
                          ),
                        );
                  },
                ),
            ],
          ),

          if (!device.isUnavailable) ...[
            AppSpacing.vGapMd,
            Row(
              children: [
                // Current temperature
                if (currentTemp != null)
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest
                            .withAlpha(80),
                        borderRadius: AppRadius.borderRadiusSm,
                      ),
                      child: Column(
                        children: [
                          Text(
                            'Actuelle',
                            style: textTheme.labelSmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          Text(
                            '${currentTemp.toStringAsFixed(1)} °C',
                            style: textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                if (currentTemp != null && targetTemp != null)
                  AppSpacing.hGapSm,

                // Target temperature with +/- buttons
                if (targetTemp != null)
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: colorScheme.primaryContainer
                            .withAlpha(60),
                        borderRadius: AppRadius.borderRadiusSm,
                      ),
                      child: Row(
                        mainAxisAlignment:
                            MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 48,
                            height: 48,
                            child: IconButton(
                              icon: const Icon(Icons.remove),
                              iconSize: 20,
                              tooltip: 'Diminuer la temperature',
                              onPressed: () {
                                HapticFeedback.selectionClick();
                                context.read<HomesBloc>().add(
                                      HomesSetTemperature(
                                        entityId:
                                            device.entityId,
                                        temperature:
                                            targetTemp - 0.5,
                                      ),
                                    );
                              },
                            ),
                          ),
                          Column(
                            children: [
                              Text(
                                'Cible',
                                style: textTheme.labelSmall
                                    ?.copyWith(
                                  color: colorScheme
                                      .onPrimaryContainer,
                                ),
                              ),
                              Text(
                                '${targetTemp.toStringAsFixed(1)} °C',
                                style: textTheme.titleMedium
                                    ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(
                            width: 48,
                            height: 48,
                            child: IconButton(
                              icon: const Icon(Icons.add),
                              iconSize: 20,
                              tooltip: 'Augmenter la temperature',
                              onPressed: () {
                                HapticFeedback.selectionClick();
                                context.read<HomesBloc>().add(
                                      HomesSetTemperature(
                                        entityId:
                                            device.entityId,
                                        temperature:
                                            targetTemp + 0.5,
                                      ),
                                    );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Cover device card (open/close/stop buttons)
// =============================================================================

class _CoverDeviceCard extends StatelessWidget {
  final HaDevice device;
  final bool isDark;

  const _CoverDeviceCard({
    required this.device,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final position = device.currentPosition;

    return _DeviceCardContainer(
      device: device,
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                device.isOn
                    ? Icons.blinds
                    : Icons.blinds_closed,
                color: device.isOn
                    ? colorScheme.primary
                    : colorScheme.onSurfaceVariant,
                size: 24,
              ),
              AppSpacing.hGapSm,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.friendlyName,
                      style: textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      device.isUnavailable
                          ? 'Indisponible'
                          : position != null
                              ? 'Ouvert a $position%'
                              : device.isOn
                                  ? 'Ouvert'
                                  : 'Ferme',
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (!device.isUnavailable) ...[
            AppSpacing.vGapMd,
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      context.read<HomesBloc>().add(
                            HomesToggleDevice(
                              entityId: device.entityId,
                              domain: 'cover',
                              turnOn: true,
                            ),
                          );
                    },
                    icon: const Icon(Icons.arrow_upward, size: 18),
                    label: const Text('Ouvrir'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 48),
                    ),
                  ),
                ),
                AppSpacing.hGapSm,
                SizedBox(
                  height: 48,
                  width: 48,
                  child: OutlinedButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      context.read<HomesBloc>().add(
                            HomesToggleDevice(
                              entityId: device.entityId,
                              domain: 'cover',
                              turnOn: false,
                            ),
                          );
                    },
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                    ),
                    child: const Icon(Icons.stop, size: 18),
                  ),
                ),
                AppSpacing.hGapSm,
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      context.read<HomesBloc>().add(
                            HomesToggleDevice(
                              entityId: device.entityId,
                              domain: 'cover',
                              turnOn: false,
                            ),
                          );
                    },
                    icon: const Icon(Icons.arrow_downward,
                        size: 18),
                    label: const Text('Fermer'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 48),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Sensor device card (read-only value display)
// =============================================================================

class _SensorDeviceCard extends StatelessWidget {
  final HaDevice device;
  final bool isDark;

  const _SensorDeviceCard({
    required this.device,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final unit = device.attributes['unit_of_measurement'] as String? ?? '';

    return _DeviceCardContainer(
      device: device,
      isDark: isDark,
      child: Row(
        children: [
          Icon(
            _sensorIcon(device),
            color: colorScheme.secondary,
            size: 24,
          ),
          AppSpacing.hGapSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  device.friendlyName,
                  style: textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  device.isUnavailable
                      ? 'Indisponible'
                      : device.domain == 'binary_sensor'
                          ? (device.isOn ? 'Detecte' : 'Normal')
                          : '${device.state} $unit'.trim(),
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          if (!device.isUnavailable &&
              device.domain == 'sensor')
            Text(
              '${device.state} $unit',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.primary,
              ),
            ),
          if (!device.isUnavailable &&
              device.domain == 'binary_sensor')
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: device.isOn
                    ? colorScheme.tertiary
                    : colorScheme.onSurfaceVariant.withAlpha(60),
              ),
            ),
        ],
      ),
    );
  }

  IconData _sensorIcon(HaDevice device) {
    final deviceClass =
        device.attributes['device_class'] as String?;
    switch (deviceClass) {
      case 'temperature':
        return Icons.thermostat_outlined;
      case 'humidity':
        return Icons.water_drop_outlined;
      case 'battery':
        return Icons.battery_full_outlined;
      case 'power':
      case 'energy':
        return Icons.bolt_outlined;
      case 'motion':
        return Icons.directions_walk_outlined;
      case 'door':
        return Icons.door_front_door_outlined;
      case 'window':
        return Icons.window_outlined;
      case 'smoke':
        return Icons.smoke_free_outlined;
      case 'illuminance':
        return Icons.wb_sunny_outlined;
      default:
        return device.domain == 'binary_sensor'
            ? Icons.notifications_outlined
            : Icons.sensors_outlined;
    }
  }
}
