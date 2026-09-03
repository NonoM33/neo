import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/config/app_config.dart';
import '../../../domain/entities/quote.dart';
import '../../widgets/ds/ds.dart';
import 'quote_screen.dart' show euro;

/// Signature en direct — **l'iPad est tendu au client**.
///
/// C'est le seul ecran que le client manipule : mode client permanent, aucune
/// donnee interne (marge, prix d'achat), typographie genereuse, sortie protegee.
/// 100 % Flutter natif, aucune WebView.
class DirectSigningScreen extends ConsumerStatefulWidget {
  const DirectSigningScreen({
    required this.signatureRequestId,
    required this.quote,
    super.key,
  });

  final String signatureRequestId;
  final Quote quote;

  @override
  ConsumerState<DirectSigningScreen> createState() =>
      _DirectSigningScreenState();
}

class _DirectSigningScreenState extends ConsumerState<DirectSigningScreen> {
  final DsSignatureController _signature = DsSignatureController();
  bool _cgvAccepted = false;
  bool _cgvExpanded = false;
  bool _submitting = false;
  bool _signed = false;
  String? _error;

  bool get _canSubmit =>
      _cgvAccepted && _signature.isNotEmpty && !_submitting;

  @override
  void initState() {
    super.initState();
    _signature.addListener(_onSignatureChanged);
  }

  void _onSignatureChanged() => setState(() {});

  @override
  void dispose() {
    _signature.removeListener(_onSignatureChanged);
    _signature.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    HapticFeedback.lightImpact();

    try {
      final bytes = await _signature.toPngBytes();
      if (bytes == null) {
        throw const FormatException('Signature vide');
      }
      final payload = 'data:image/png;base64,${base64Encode(bytes)}';

      final response = await Dio().post<dynamic>(
        '${EnvironmentConfig.baseHost}/signer/${widget.signatureRequestId}/submit',
        data: {'signatureData': payload},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      if (response.statusCode != 200) {
        throw StateError('Erreur serveur (${response.statusCode})');
      }

      HapticFeedback.heavyImpact();
      if (mounted) setState(() => _signed = true);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        // Le client lit ce message : il reste factuel et non culpabilisant.
        _error = error is DioException
            ? 'Le serveur n’a pas confirmé la signature. Le document reste valable, réessayez.'
            : 'La signature n’a pas pu être envoyée. Réessayez.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final device = context.dsDevice;
    final quote = widget.quote;

    if (_signed) {
      return _SignedConfirmation(quote: quote);
    }

    final summary = _Summary(quote: quote);
    final signature = _SignatureBlock(
      controller: _signature,
      cgvAccepted: _cgvAccepted,
      cgvExpanded: _cgvExpanded,
      submitting: _submitting,
      canSubmit: _canSubmit,
      error: _error,
      onCgv: (value) => setState(() => _cgvAccepted = value),
      onToggleCgv: () => setState(() => _cgvExpanded = !_cgvExpanded),
      onSubmit: _submit,
    );

    return PopScope(
      // On ne quitte pas l'ecran de signature par accident.
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final leave = await showDsConfirmDialog(
          context,
          title: 'Quitter la signature ?',
          description:
              'Le devis ne sera pas signé et le tracé actuel sera perdu.',
          confirmLabel: 'Quitter',
        );
        if (leave && context.mounted) Navigator.of(context).pop(false);
      },
      child: Scaffold(
        backgroundColor: ds.surfaceBase,
        body: Column(
          children: [
            const DsClientModeBanner(
              message: 'Document destiné au client — signature électronique',
            ),
            DsAppBar(
              title: 'Devis ${quote.number}',
              subtitle: DateFormat('EEEE d MMMM yyyy', 'fr_FR')
                  .format(DateTime.now()),
            ),
            Expanded(
              child: device.isDesktop && context.dsIsLandscape
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(DsSpacing.s8),
                            child: summary,
                          ),
                        ),
                        VerticalDivider(width: 1, color: ds.borderSubtle),
                        Expanded(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(DsSpacing.s8),
                            child: signature,
                          ),
                        ),
                      ],
                    )
                  : SingleChildScrollView(
                      padding:
                          EdgeInsets.all(DsSpacing.pagePadding(device)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          summary,
                          const SizedBox(height: DsSpacing.gapSection),
                          signature,
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.quote});

  final Quote quote;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const DsSectionTitle('Prestations'),
        const SizedBox(height: DsSpacing.s3),
        DsCard(
          large: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final line in quote.lines) ...[
                Padding(
                  padding: const EdgeInsets.only(bottom: DsSpacing.s3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              line.description,
                              style: TextStyle(
                                fontSize: t.bodySize,
                                height: t.bodyLine / t.bodySize,
                                fontWeight: DsWeight.medium,
                                color: ds.textBody,
                              ),
                            ),
                            if (line.roomName != null || line.clientOwned)
                              Text(
                                [
                                  if (line.roomName != null) line.roomName!,
                                  if (line.clientOwned) 'Déjà possédé',
                                ].join(' · '),
                                style: TextStyle(
                                  fontSize: t.badgeSize,
                                  color: line.clientOwned
                                      ? ds.success
                                      : ds.textSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: DsSpacing.s3),
                      Text(
                        '× ${line.quantity}',
                        style: TextStyle(
                          fontSize: t.captionSize,
                          fontFeatures: dsTabularFigures,
                          color: ds.textSecondary,
                        ),
                      ),
                      const SizedBox(width: DsSpacing.s4),
                      Text(
                        euro.format(line.totalHT),
                        style: TextStyle(
                          fontSize: t.bodySize,
                          fontWeight: DsWeight.semibold,
                          fontFeatures: dsTabularFigures,
                          color: line.clientOwned
                              ? ds.textTertiary
                              : ds.textPrimary,
                          decoration: line.clientOwned
                              ? TextDecoration.lineThrough
                              : null,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: DsSpacing.gapCard),
        DsQuoteTotalsBar(
          layout: DsTotalsLayout.panel,
          clientMode: true,
          quoteNumber: quote.number,
          subtotalHT: euro.format(quote.subtotalHT),
          discount: quote.discountHT > 0
              ? '− ${euro.format(quote.discountHT)}'
              : null,
          totalHT: euro.format(quote.totalHT),
          vat: euro.format(quote.totalTVA),
          totalTTC: euro.format(quote.totalTTC),
        ),
      ],
    );
  }
}

class _SignatureBlock extends StatelessWidget {
  const _SignatureBlock({
    required this.controller,
    required this.cgvAccepted,
    required this.cgvExpanded,
    required this.submitting,
    required this.canSubmit,
    required this.error,
    required this.onCgv,
    required this.onToggleCgv,
    required this.onSubmit,
  });

  final DsSignatureController controller;
  final bool cgvAccepted;
  final bool cgvExpanded;
  final bool submitting;
  final bool canSubmit;
  final String? error;
  final ValueChanged<bool> onCgv;
  final VoidCallback onToggleCgv;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const DsSectionTitle('Conditions générales de vente'),
        const SizedBox(height: DsSpacing.s3),
        DsCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSize(
                duration: DsMotion.duration(context, DsMotion.transform),
                curve: DsMotion.easeTransform,
                child: SizedBox(
                  height: cgvExpanded ? null : 84,
                  child: Text(
                    'Le présent devis est valable pendant sa durée de validité. '
                    'Les prix sont exprimés en euros, hors taxes et toutes taxes comprises. '
                    'L’acompte éventuel est exigible à la commande. L’installation est '
                    'planifiée après réception de l’accord signé. Le matériel reste la '
                    'propriété du vendeur jusqu’au paiement complet. Le client dispose des '
                    'garanties légales de conformité et des vices cachés.',
                    style: TextStyle(
                      fontSize: t.captionSize,
                      height: 1.5,
                      color: ds.textSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: DsSpacing.s2),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: onToggleCgv,
                  child: Text(
                    cgvExpanded ? 'Réduire' : 'Lire les CGV complètes',
                  ),
                ),
              ),
              DsToggle(
                label: 'J’accepte les conditions générales de vente',
                value: cgvAccepted,
                onChanged: onCgv,
              ),
            ],
          ),
        ),
        const SizedBox(height: DsSpacing.gapSection),
        const DsSectionTitle('Signature du client'),
        const SizedBox(height: DsSpacing.s3),
        DsSignaturePad(
          controller: controller,
          height: 220,
          hintText: 'Signez ici avec le doigt ou l’Apple Pencil',
        ),
        if (error != null) ...[
          const SizedBox(height: DsSpacing.s4),
          DsErrorState(
            kind: DsErrorKind.server,
            inline: true,
            title: 'Signature non transmise',
            description: error,
          ),
        ],
        const SizedBox(height: DsSpacing.s5),
        DsButton(
          label: 'Valider et signer le devis',
          icon: DsGlyph.signature,
          variant: DsButtonVariant.clientMode,
          size: DsButtonSize.large,
          fullWidth: true,
          loading: submitting,
          onPressed: canSubmit ? onSubmit : null,
        ),
        if (!canSubmit && !submitting) ...[
          const SizedBox(height: DsSpacing.s2),
          Text(
            controller.isEmpty
                ? 'Signez dans le cadre pour valider.'
                : 'Acceptez les conditions générales pour valider.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: t.captionSize,
              color: ds.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}

/// Confirmation post-signature — le client doit voir que c'est fait.
class _SignedConfirmation extends StatelessWidget {
  const _SignedConfirmation({required this.quote});

  final Quote quote;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Padding(
              padding: const EdgeInsets.all(DsSpacing.s8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: ds.soft(ds.success, 0.16),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: DsIcon(
                      DsGlyph.checkCircle,
                      size: 52,
                      color: ds.success,
                    ),
                  ),
                  const SizedBox(height: DsSpacing.s6),
                  Text(
                    'Devis signé',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: t.h1Size,
                      fontWeight: DsWeight.semibold,
                      letterSpacing: -0.5,
                      color: ds.textPrimary,
                    ),
                  ),
                  const SizedBox(height: DsSpacing.s3),
                  Text(
                    'Le devis ${quote.number} est signé pour '
                    '${euro.format(quote.totalTTC)} TTC. '
                    'Une copie part par email au client.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: t.bodySize,
                      height: t.bodyLine / t.bodySize,
                      color: ds.textSecondary,
                    ),
                  ),
                  const SizedBox(height: DsSpacing.s8),
                  DsButton(
                    label: 'Terminer',
                    icon: DsGlyph.checkCircle,
                    size: DsButtonSize.large,
                    fullWidth: true,
                    onPressed: () => Navigator.of(context).pop(true),
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
