import 'dart:convert';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/quote.dart';

// ============================================================================
// Écran de signature directe — 100% natif Flutter, zéro WebView
// ============================================================================

class DirectSigningScreen extends ConsumerStatefulWidget {
  final String signatureRequestId;
  final Quote quote;

  const DirectSigningScreen({
    super.key,
    required this.signatureRequestId,
    required this.quote,
  });

  @override
  ConsumerState<DirectSigningScreen> createState() => _DirectSigningScreenState();
}

class _DirectSigningScreenState extends ConsumerState<DirectSigningScreen> {
  bool _cgvAccepted = false;
  bool _hasSig = false;
  bool _submitting = false;
  bool _cgvExpanded = false;

  final List<List<Offset?>> _strokes = [];
  List<Offset?> _current = [];

  bool get _canSubmit => _cgvAccepted && _hasSig && !_submitting;

  // ---- Signature canvas helpers ----

  void _onPanStart(DragStartDetails d, RenderBox box) {
    HapticFeedback.selectionClick();
    final pos = box.globalToLocal(d.globalPosition);
    setState(() {
      _current = [pos];
      _hasSig = true;
    });
  }

  void _onPanUpdate(DragUpdateDetails d, RenderBox box) {
    final pos = box.globalToLocal(d.globalPosition);
    setState(() {
      _current.add(pos);
    });
  }

  void _onPanEnd(DragEndDetails _) {
    setState(() {
      _strokes.add(List.from(_current));
      _strokes.last.add(null); // stroke separator
      _current = [];
    });
  }

  void _clearSignature() {
    setState(() {
      _strokes.clear();
      _current = [];
      _hasSig = false;
    });
  }

  // ---- Capture signature as PNG base64 ----
  Future<String> _captureSignature(GlobalKey canvasKey) async {
    final recorder = ui.PictureRecorder();
    final size = (canvasKey.currentContext?.findRenderObject() as RenderBox?)?.size ?? const Size(600, 180);
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), Paint()..color = Colors.white);

    final paint = Paint()
      ..color = const Color(0xFF1a1d21)
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final allStrokes = [..._strokes, _current];
    for (final stroke in allStrokes) {
      final path = Path();
      bool moved = false;
      for (final pt in stroke) {
        if (pt == null) { moved = false; continue; }
        if (!moved) { path.moveTo(pt.dx, pt.dy); moved = true; }
        else { path.lineTo(pt.dx, pt.dy); }
      }
      canvas.drawPath(path, paint);
    }

    final picture = recorder.endRecording();
    final img = await picture.toImage(size.width.toInt(), size.height.toInt());
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) throw Exception('Impossible de capturer la signature');
    final b64 = base64Encode(bytes.buffer.asUint8List());
    return 'data:image/png;base64,$b64';
  }

  final _canvasKey = GlobalKey();

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _submitting = true);
    HapticFeedback.lightImpact();

    try {
      final sigData = await _captureSignature(_canvasKey);

      // POST to /signer/:id/submit — root-level route (not under /api)
      final baseHost = EnvironmentConfig.baseHost;
      final dio = Dio();
      final response = await dio.post(
        '$baseHost/signer/${widget.signatureRequestId}/submit',
        data: {'signatureData': sigData},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          HapticFeedback.heavyImpact();
          Navigator.of(context).pop(true); // success
        }
      } else {
        throw Exception('Erreur serveur (${response.statusCode})');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final q = widget.quote;
    final today = DateTime.now();
    final dateStr = '${today.day.toString().padLeft(2, '0')}/${today.month.toString().padLeft(2, '0')}/${today.year}';

    return Scaffold(
      backgroundColor: const Color(0xFFf5f7fa),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0d47a1),
        foregroundColor: Colors.white,
        title: Text('Signature — ${q.number}'),
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ---- Résumé devis ----
                  _Card(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _SectionTitle('Résumé du devis'),
                        AppSpacing.vGapSm,
                        _InfoRow('Devis', q.number),
                        _InfoRow('Date', dateStr),
                        _InfoRow('Total TTC', _eur(q.totalTTC)),
                        const Divider(height: 20),
                        if (q.lines.isNotEmpty) ...[
                          Text('Prestations', style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: const Color(0xFF0d47a1), fontWeight: FontWeight.w700, letterSpacing: .5,
                          )),
                          AppSpacing.vGapXs,
                          ...q.lines.take(8).map((l) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                Expanded(child: Text(l.description, style: const TextStyle(fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                const SizedBox(width: 8),
                                Text(l.clientOwned ? 'Déjà possédé' : '${l.quantity} × ${_eur(l.unitPriceHT)}',
                                    style: TextStyle(fontSize: 12, color: l.clientOwned ? Colors.grey : colorScheme.onSurface)),
                              ],
                            ),
                          )),
                          if (q.lines.length > 8)
                            Text('... et ${q.lines.length - 8} autre(s)', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total HT', style: TextStyle(fontWeight: FontWeight.w500)),
                            Text(_eur(q.totalHT)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TVA', style: TextStyle(fontWeight: FontWeight.w500)),
                            Text(_eur(q.totalTVA)),
                          ],
                        ),
                        const Divider(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TOTAL TTC', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(_eur(q.totalTTC), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0d47a1))),
                          ],
                        ),
                      ],
                    ),
                  ),

                  AppSpacing.vGapMd,

                  // ---- CGV ----
                  _Card(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _SectionTitle('Conditions Générales de Vente'),
                        AppSpacing.vGapSm,
                        GestureDetector(
                          onTap: () => setState(() => _cgvExpanded = !_cgvExpanded),
                          child: Row(
                            children: [
                              Icon(_cgvExpanded ? Icons.expand_less : Icons.expand_more, size: 18, color: const Color(0xFF0d47a1)),
                              const SizedBox(width: 4),
                              Text(_cgvExpanded ? 'Réduire' : 'Lire les CGV complètes',
                                  style: const TextStyle(fontSize: 13, color: Color(0xFF0d47a1), fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        if (_cgvExpanded) ...[
                          AppSpacing.vGapSm,
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFf9f9f9),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFe0e0e0)),
                            ),
                            child: const Text(_cgvText, style: TextStyle(fontSize: 11.5, height: 1.6, color: Color(0xFF444444))),
                          ),
                        ],
                        AppSpacing.vGapMd,
                        CheckboxListTile(
                          value: _cgvAccepted,
                          onChanged: (v) => setState(() => _cgvAccepted = v ?? false),
                          title: Text(
                            'J\'accepte les CGV et CGU. Je reconnais avoir pris connaissance du devis N° ${q.number} d\'un montant total TTC de ${_eur(q.totalTTC)} et l\'approuve sans réserve.',
                            style: const TextStyle(fontSize: 13, height: 1.4),
                          ),
                          activeColor: const Color(0xFF0d47a1),
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),

                  AppSpacing.vGapMd,

                  // ---- Canvas signature ----
                  _Card(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _SectionTitle('Signature du client'),
                            TextButton.icon(
                              onPressed: _clearSignature,
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('Effacer', style: TextStyle(fontSize: 13)),
                              style: TextButton.styleFrom(foregroundColor: Colors.grey[600]),
                            ),
                          ],
                        ),
                        AppSpacing.vGapSm,
                        Stack(
                          children: [
                            Container(
                              key: _canvasKey,
                              height: 180,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _hasSig ? const Color(0xFF0d47a1) : const Color(0xFFc0c8d8),
                                  width: _hasSig ? 2 : 1.5,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(9),
                                child: LayoutBuilder(builder: (ctx, constraints) {
                                  return GestureDetector(
                                    onPanStart: (d) => _onPanStart(d, ctx.findRenderObject() as RenderBox),
                                    onPanUpdate: (d) => _onPanUpdate(d, ctx.findRenderObject() as RenderBox),
                                    onPanEnd: _onPanEnd,
                                    child: CustomPaint(
                                      painter: _SignaturePainter(
                                        strokes: _strokes,
                                        currentStroke: _current,
                                      ),
                                      child: Container(color: Colors.transparent),
                                    ),
                                  );
                                }),
                              ),
                            ),
                            if (!_hasSig)
                              const Positioned.fill(
                                child: IgnorePointer(
                                  child: Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.draw, size: 32, color: Color(0xFFc0c8d8)),
                                        SizedBox(height: 6),
                                        Text('Signez ici avec le doigt', style: TextStyle(color: Color(0xFFaaaaaa), fontSize: 14)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        AppSpacing.vGapXs,
                        const Text('(Précédé de « Lu et approuvé »)', style: TextStyle(fontSize: 11, color: Colors.grey), textAlign: TextAlign.center),
                      ],
                    ),
                  ),

                  AppSpacing.vGapMd,
                ],
              ),
            ),
          ),

          // ---- Bottom submit bar ----
          Container(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFe0e0e0))),
            ),
            child: FilledButton(
              onPressed: _canSubmit ? _submit : null,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF0d47a1),
                disabledBackgroundColor: const Color(0xFFc0c8d8),
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _submitting
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : const Text('Valider et signer le devis', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Painter
// ============================================================================

class _SignaturePainter extends CustomPainter {
  final List<List<Offset?>> strokes;
  final List<Offset?> currentStroke;

  const _SignaturePainter({required this.strokes, required this.currentStroke});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF1a1d21)
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in [...strokes, currentStroke]) {
      final path = Path();
      bool moved = false;
      for (final pt in stroke) {
        if (pt == null) { moved = false; continue; }
        if (!moved) { path.moveTo(pt.dx, pt.dy); moved = true; }
        else { path.lineTo(pt.dx, pt.dy); }
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter old) => true;
}

// ============================================================================
// Helper widgets
// ============================================================================

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 6, offset: const Offset(0, 2))],
    ),
    child: child,
  );
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: .5, color: Color(0xFF0d47a1)),
  );
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      children: [
        SizedBox(width: 90, child: Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
      ],
    ),
  );
}

String _eur(double v) => '${v.toStringAsFixed(2).replaceAll('.', ',')} €';

const _cgvText = '''Article 1 – Objet
Ces CGV régissent la fourniture et l'installation de systèmes domotiques par NEO Domotique.

Article 2 – Prix et paiement
30 % à la commande, 40 % à la livraison, 30 % à la réception. Pénalités de retard : 3× le taux légal.

Article 3 – Réserve de propriété
Le matériel reste propriété de NEO Domotique jusqu'au paiement intégral.

Article 4 – Garanties
Garantie constructeur sur le matériel. Main-d'œuvre garantie 1 an à compter de la réception.

Article 5 – Droit de rétractation
14 jours (art. L.221-18 Code de la consommation), sauf démarrage des travaux avec accord exprès.

Article 6 – Responsabilité
Limitée au montant du devis. Aucune responsabilité pour dommages indirects.

Article 7 – Données personnelles
Conformément au RGPD, vos données sont traitées uniquement dans le cadre du contrat.

Article 8 – Litiges
Recherche amiable préalable. À défaut, tribunal de commerce compétent.''';
