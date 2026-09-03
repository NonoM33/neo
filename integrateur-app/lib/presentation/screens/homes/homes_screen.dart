import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/ha_device.dart';
import '../../blocs/homes/homes_bloc.dart';
import '../../blocs/homes/homes_event.dart';
import '../../blocs/homes/homes_state.dart';
import '../../widgets/ds/ds.dart';

/// Ma Maison — pilotage Home Assistant.
///
/// C'est l'ecran le plus « grand public » de l'app : il est montre au client
/// en demonstration ou en verification post-installation. Il porte donc le
/// mode client et le traitement visuel le plus soigne.
class HomesScreen extends ConsumerStatefulWidget {
  const HomesScreen({super.key});

  @override
  ConsumerState<HomesScreen> createState() => _HomesScreenState();
}

class _HomesScreenState extends ConsumerState<HomesScreen> {
  bool _clientMode = false;
  String? _domainFilter;

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(homesBlocProvider);
    final ds = context.ds;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<HomesBloc, HomesState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is HomesError) {
            showDsSnackbar(context, message: state.message, tone: DsTone.error);
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              if (_clientMode)
                DsClientModeBanner(
                  message: 'Mode client — démonstration de l’installation',
                  onExit: () => setState(() => _clientMode = false),
                ),
              DsAppBar(
                title: 'Ma Maison',
                subtitle: switch (state) {
                  HomesConnected(devices: final devices) =>
                    '${devices.length} appareil${devices.length > 1 ? 's' : ''} détecté${devices.length > 1 ? 's' : ''}',
                  HomesConnecting() => 'Connexion au serveur domotique…',
                  _ => 'Serveur domotique non connecté',
                },
                actions: [
                  if (state is HomesConnected) ...[
                    if (!_clientMode)
                      DsIconButton(
                        icon: Icons.present_to_all_rounded,
                        label: 'Présenter au client',
                        onPressed: () => setState(() => _clientMode = true),
                      ),
                    DsIconButton(
                      icon: Icons.link_off_rounded,
                      label: 'Déconnecter',
                      onPressed: () =>
                          bloc.add(const HomesDisconnectRequested()),
                    ),
                  ],
                ],
              ),
              Expanded(
                child: switch (state) {
                  HomesConnecting() => const DsSkeletonGrid(crossAxisCount: 2),
                  HomesConnected() => _Devices(
                      state: state,
                      bloc: bloc,
                      domainFilter: _domainFilter,
                      onDomainFilter: (value) =>
                          setState(() => _domainFilter = value),
                    ),
                  HomesError(message: final message) => DsErrorState(
                      kind: DsErrorKind.fromMessage(message),
                      title: 'Serveur domotique injoignable',
                      description: message,
                      action: DsButton(
                        label: 'Reconfigurer',
                        icon: DsGlyph.settings,
                        onPressed: () => _openConnect(context, bloc),
                      ),
                    ),
                  _ => _Disconnected(
                      onConnect: () => _openConnect(context, bloc),
                    ),
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _openConnect(BuildContext context, HomesBloc bloc) async {
    final urlController = TextEditingController(text: 'https://');
    final tokenController = TextEditingController();
    String? error;

    final connect = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => DsDialog(
          title: 'Connecter le serveur domotique',
          description:
              'L’adresse de la box Home Assistant et un jeton d’accès longue durée créé depuis son profil.',
          icon: DsGlyph.home,
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DsTextField(
                label: 'Adresse du serveur',
                controller: urlController,
                hintText: 'https://maison.local:8123',
                keyboardType: TextInputType.url,
                required: true,
                errorText: error,
              ),
              const SizedBox(height: DsSpacing.s4),
              DsTextField(
                label: 'Jeton d’accès longue durée',
                controller: tokenController,
                obscureText: true,
                required: true,
                textInputAction: TextInputAction.done,
              ),
            ],
          ),
          actions: [
            DsButton(
              label: 'Annuler',
              variant: DsButtonVariant.ghost,
              onPressed: () => Navigator.of(dialogContext).pop(false),
            ),
            DsButton(
              label: 'Se connecter',
              onPressed: () {
                final url = urlController.text.trim();
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  setDialogState(
                    () => error = 'L’adresse doit commencer par http:// ou https://',
                  );
                  return;
                }
                if (tokenController.text.trim().isEmpty) {
                  setDialogState(() => error = null);
                  return;
                }
                Navigator.of(dialogContext).pop(true);
              },
            ),
          ],
        ),
      ),
    );

    if (connect ?? false) {
      bloc.add(
        HomesConnectRequested(
          url: urlController.text.trim(),
          token: tokenController.text.trim(),
        ),
      );
    }

    urlController.dispose();
    tokenController.dispose();
  }
}

class _Disconnected extends StatelessWidget {
  const _Disconnected({required this.onConnect});

  final VoidCallback onConnect;

  @override
  Widget build(BuildContext context) {
    return DsEmptyState(
      icon: DsGlyph.home,
      title: 'Aucune installation connectée',
      description:
          'Connectez la box domotique du client pour piloter ses lumières, volets, chauffage et caméras depuis l’app.',
      action: DsButton(
        label: 'Connecter une maison',
        icon: DsGlyph.add,
        size: DsButtonSize.large,
        onPressed: onConnect,
      ),
    );
  }
}

class _Devices extends StatelessWidget {
  const _Devices({
    required this.state,
    required this.bloc,
    required this.domainFilter,
    required this.onDomainFilter,
  });

  final HomesConnected state;
  final HomesBloc bloc;
  final String? domainFilter;
  final ValueChanged<String?> onDomainFilter;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);
    final domains = state.devicesByDomain.keys.toList()..sort();

    final devices = domainFilter == null
        ? state.devices
        : (state.devicesByDomain[domainFilter] ?? const <HaDevice>[]);

    if (state.devices.isEmpty) {
      return const DsEmptyState(
        icon: DsGlyph.sensors,
        title: 'Aucun appareil détecté',
        description:
            'La box répond, mais n’expose aucune entité. Vérifiez les intégrations côté Home Assistant.',
      );
    }

    return Column(
      children: [
        SizedBox(
          height: DsSpacing.targetMin + DsSpacing.s4,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: padding),
            children: [
              DsFilterChip(
                label: 'Tous',
                count: state.devices.length,
                selected: domainFilter == null,
                onSelected: () => onDomainFilter(null),
              ),
              for (final domain in domains) ...[
                const SizedBox(width: DsSpacing.s2),
                DsFilterChip(
                  label: DsDeviceDomain.fromHaDomain(domain).label,
                  icon: DsDeviceDomain.fromHaDomain(domain).icon,
                  count: state.devicesByDomain[domain]?.length,
                  selected: domainFilter == domain,
                  onSelected: () => onDomainFilter(
                    domainFilter == domain ? null : domain,
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: EdgeInsets.fromLTRB(
              padding,
              DsSpacing.s2,
              padding,
              DsSpacing.s16,
            ),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: switch (device) {
                DsDevice.phone => 1,
                DsDevice.tablet => 2,
                DsDevice.desktop => 3,
              },
              mainAxisSpacing: DsSpacing.gapCard,
              crossAxisSpacing: DsSpacing.gapCard,
              mainAxisExtent: 132,
            ),
            itemCount: devices.length,
            itemBuilder: (context, index) {
              final entity = devices[index];
              final domain = DsDeviceDomain.fromHaDomain(entity.domain);
              final level = entity.brightness != null
                  ? (entity.brightness! / 255 * 100).round()
                  : entity.currentPosition;

              return DsDeviceCard(
                domain: domain,
                name: entity.friendlyName,
                state: _stateLabel(entity),
                on: entity.isOn,
                level: level,
                unavailable: entity.isUnavailable,
                onToggle: entity.isUnavailable
                    ? null
                    : (value) => bloc.add(
                          HomesToggleDevice(
                            entityId: entity.entityId,
                            domain: entity.domain,
                            turnOn: value,
                          ),
                        ),
              );
            },
          ),
        ),
      ],
    );
  }

  String _stateLabel(HaDevice entity) {
    if (entity.isUnavailable) return 'Indisponible';
    final position = entity.currentPosition;
    if (entity.domain == 'cover' && position != null) {
      return position == 0 ? 'Fermé' : 'Ouvert à $position %';
    }
    if (entity.domain == 'climate') {
      final current = entity.currentTemperature;
      final target = entity.temperature;
      if (current != null && target != null) {
        return '${current.toStringAsFixed(1)} °C · cible ${target.toStringAsFixed(1)} °C';
      }
    }
    return entity.isOn ? 'Allumé' : 'Éteint';
  }
}
