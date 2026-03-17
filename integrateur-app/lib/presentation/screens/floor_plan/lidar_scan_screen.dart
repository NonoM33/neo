import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/services/lidar_scan_service.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/floor_plan.dart';

/// Full-screen LiDAR room scanning screen.
/// Returns a [FloorPlan] via Navigator.pop when scan completes.
class LidarScanScreen extends StatefulWidget {
  final String roomId;
  final String projectId;
  final String roomName;

  const LidarScanScreen({
    super.key,
    required this.roomId,
    required this.projectId,
    this.roomName = '',
  });

  @override
  State<LidarScanScreen> createState() => _LidarScanScreenState();
}

class _LidarScanScreenState extends State<LidarScanScreen> {
  final LidarScanService _scanService = LidarScanService();
  _ScanState _state = _ScanState.checking;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkSupport();
  }

  Future<void> _checkSupport() async {
    final supported = await _scanService.isSupported();
    if (!mounted) return;

    if (supported) {
      setState(() => _state = _ScanState.ready);
    } else {
      setState(() {
        _state = _ScanState.unsupported;
        _errorMessage =
            'Ce dispositif ne supporte pas le scan LiDAR.\n\n'
            'Requis : iPhone 12 Pro ou ultérieur / iPad Pro avec LiDAR, '
            'iOS 16.0 minimum.';
      });
    }
  }

  Future<void> _startScan() async {
    setState(() => _state = _ScanState.scanning);
    HapticFeedback.lightImpact();

    try {
      final jsonPath = await _scanService.startScanAndWait();

      if (!mounted) return;

      if (jsonPath == null) {
        setState(() {
          _state = _ScanState.ready;
          _errorMessage = 'Scan annulé ou aucune donnée capturée.';
        });
        return;
      }

      setState(() => _state = _ScanState.processing);

      final floorPlan = await _scanService.parseJsonToFloorPlan(
        jsonFilePath: jsonPath,
        roomId: widget.roomId,
        projectId: widget.projectId,
      );

      if (!mounted) return;

      if (floorPlan != null) {
        HapticFeedback.heavyImpact();
        Navigator.of(context).pop(floorPlan);
      } else {
        setState(() {
          _state = _ScanState.ready;
          _errorMessage =
              'Impossible de convertir le scan en plan. '
              'Essayez de scanner à nouveau en vous déplaçant lentement.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _ScanState.ready;
        _errorMessage = 'Erreur: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('Scan LiDAR${widget.roomName.isNotEmpty ? ' - ${widget.roomName}' : ''}'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Padding(
            padding: AppSpacing.pagePadding,
            child: _buildContent(colorScheme, textTheme),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(ColorScheme colorScheme, TextTheme textTheme) {
    switch (_state) {
      case _ScanState.checking:
        return const Center(child: CircularProgressIndicator());

      case _ScanState.unsupported:
        return _buildMessageCard(
          colorScheme,
          textTheme,
          icon: Icons.no_photography,
          iconColor: colorScheme.error,
          title: 'LiDAR non disponible',
          message: _errorMessage ?? '',
          action: FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Retour'),
          ),
        );

      case _ScanState.ready:
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Error from previous attempt
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: colorScheme.errorContainer.withAlpha(60),
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: colorScheme.error, size: 20),
                    AppSpacing.hGapSm,
                    Expanded(
                      child: Text(_errorMessage!,
                          style: textTheme.bodySmall
                              ?.copyWith(color: colorScheme.error)),
                    ),
                  ],
                ),
              ),
              AppSpacing.vGapLg,
            ],

            // Scan instructions
            _buildMessageCard(
              colorScheme,
              textTheme,
              icon: Icons.view_in_ar,
              iconColor: colorScheme.primary,
              title: 'Scanner la pièce',
              message:
                  'Pointez votre appareil vers la pièce et déplacez-vous '
                  'lentement le long des murs.\n\n'
                  'Le scan détectera automatiquement :\n'
                  '\u{2022} Les murs et leurs dimensions\n'
                  '\u{2022} Les portes et fenêtres\n'
                  '\u{2022} Les ouvertures\n\n'
                  'Conseil : commencez par un coin et faites le tour de la pièce.',
              action: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _startScan,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Démarrer le scan'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(120, 56),
                  ),
                ),
              ),
            ),
          ],
        );

      case _ScanState.scanning:
        return _buildMessageCard(
          colorScheme,
          textTheme,
          icon: Icons.radar,
          iconColor: colorScheme.primary,
          title: 'Scan en cours...',
          message:
              'Déplacez-vous lentement dans la pièce.\n'
              'Le scan se termine automatiquement quand vous appuyez '
              'sur "Terminé" dans l\'interface native.',
          action: const Padding(
            padding: EdgeInsets.only(top: 16),
            child: CircularProgressIndicator(),
          ),
        );

      case _ScanState.processing:
        return _buildMessageCard(
          colorScheme,
          textTheme,
          icon: Icons.architecture,
          iconColor: colorScheme.tertiary,
          title: 'Génération du plan...',
          message: 'Conversion du scan 3D en plan 2D avec murs et ouvertures.',
          action: const Padding(
            padding: EdgeInsets.only(top: 16),
            child: CircularProgressIndicator(),
          ),
        );
    }
  }

  Widget _buildMessageCard(
    ColorScheme colorScheme,
    TextTheme textTheme, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String message,
    Widget? action,
  }) {
    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingLarge,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 72, color: iconColor),
            AppSpacing.vGapMd,
            Text(
              title,
              style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            AppSpacing.vGapSm,
            Text(
              message,
              style: textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              AppSpacing.vGapLg,
              action,
            ],
          ],
        ),
      ),
    );
  }
}

enum _ScanState {
  checking,
  unsupported,
  ready,
  scanning,
  processing,
}
