import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/di/providers.dart';
import '../../../core/services/scan_session_service.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/floor_plan.dart';

/// Screen shown on iPad: displays a QR code for the iPhone to scan.
/// Polls the backend until the iPhone uploads the LiDAR scan result.
class QrScanScreen extends ConsumerStatefulWidget {
  final String roomId;
  final String projectId;
  final String roomName;

  const QrScanScreen({
    super.key,
    required this.roomId,
    required this.projectId,
    this.roomName = '',
  });

  @override
  ConsumerState<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends ConsumerState<QrScanScreen>
    with SingleTickerProviderStateMixin {
  late final ScanSessionService _sessionService;
  ScanSession? _session;
  bool _isCreating = true;
  String? _error;
  StreamSubscription<FloorPlan>? _resultSub;
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _sessionService = ScanSessionService(ref.read(apiClientProvider));
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _createSession();
  }

  Future<void> _createSession() async {
    try {
      final session = await _sessionService.createSession(
        roomId: widget.roomId,
        projectId: widget.projectId,
        roomName: widget.roomName,
      );

      if (!mounted) return;

      setState(() {
        _session = session;
        _isCreating = false;
      });

      // Start polling for result
      _sessionService.startPolling(
        session.id,
        roomId: widget.roomId,
        projectId: widget.projectId,
      );

      // Listen for result
      _resultSub = _sessionService.resultStream.listen((plan) {
        if (!mounted) return;
        HapticFeedback.heavyImpact();
        Navigator.of(context).pop(plan);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Impossible de créer la session: $e';
        _isCreating = false;
      });
    }
  }

  @override
  void dispose() {
    _resultSub?.cancel();
    _sessionService.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(
            'Scan LiDAR${widget.roomName.isNotEmpty ? ' - ${widget.roomName}' : ''}'),
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
    if (_isCreating) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Card(
        child: Padding(
          padding: AppSpacing.cardPaddingLarge,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 64, color: colorScheme.error),
              AppSpacing.vGapMd,
              Text(_error!, style: textTheme.bodyLarge),
              AppSpacing.vGapLg,
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Retour'),
              ),
            ],
          ),
        ),
      );
    }

    final session = _session!;

    return SingleChildScrollView(
      child: Column(
        children: [
          // QR Code card
          Card(
            child: Padding(
              padding: AppSpacing.cardPaddingLarge,
              child: Column(
                children: [
                  // Step indicator
                  _buildStepIndicator(colorScheme, textTheme),
                  AppSpacing.vGapLg,

                  // QR Code
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: AppRadius.borderRadiusLg,
                    ),
                    child: QrImageView(
                      data: session.scanUrl,
                      version: QrVersions.auto,
                      size: 220,
                      backgroundColor: Colors.white,
                    ),
                  ),
                  AppSpacing.vGapMd,

                  Text(
                    'Scannez avec votre iPhone',
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  AppSpacing.vGapSm,
                  Text(
                    'Ouvrez l\'appareil photo de votre iPhone et pointez vers ce QR code. '
                    'L\'app Neo s\'ouvrira automatiquement en mode scan.',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),

          AppSpacing.vGapMd,

          // Waiting indicator
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Opacity(
                opacity: 0.5 + _pulseController.value * 0.5,
                child: child,
              );
            },
            child: Card(
              color: colorScheme.primaryContainer.withAlpha(40),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colorScheme.primary,
                      ),
                    ),
                    AppSpacing.hGapMd,
                    Expanded(
                      child: Text(
                        'En attente du scan LiDAR depuis votre iPhone...',
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          AppSpacing.vGapMd,

          // Instructions
          Card(
            child: Padding(
              padding: AppSpacing.cardPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Comment ça marche',
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  AppSpacing.vGapMd,
                  _buildStep(colorScheme, textTheme, '1',
                      'Scannez le QR code avec votre iPhone'),
                  _buildStep(colorScheme, textTheme, '2',
                      'L\'app Neo s\'ouvre en mode scan LiDAR'),
                  _buildStep(colorScheme, textTheme, '3',
                      'Faites le tour de la pièce lentement'),
                  _buildStep(colorScheme, textTheme, '4',
                      'Le plan apparaît ici automatiquement'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(ColorScheme colorScheme, TextTheme textTheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _stepDot(colorScheme, true, '1'),
        _stepLine(colorScheme, false),
        _stepDot(colorScheme, false, '2'),
        _stepLine(colorScheme, false),
        _stepDot(colorScheme, false, '3'),
      ],
    );
  }

  Widget _stepDot(ColorScheme colorScheme, bool active, String label) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: active ? colorScheme.primary : colorScheme.surfaceContainerHighest,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          label,
          style: TextStyle(
            color: active ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _stepLine(ColorScheme colorScheme, bool active) {
    return Container(
      width: 40,
      height: 2,
      color: active ? colorScheme.primary : colorScheme.outlineVariant,
    );
  }

  Widget _buildStep(
    ColorScheme colorScheme,
    TextTheme textTheme,
    String number,
    String text,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: TextStyle(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          AppSpacing.hGapMd,
          Expanded(
            child: Text(text, style: textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
