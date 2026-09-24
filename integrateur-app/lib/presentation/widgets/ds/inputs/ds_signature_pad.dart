import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Controleur du pad de signature — permet d'effacer et d'exporter en PNG.
class DsSignatureController extends ChangeNotifier {
  final List<List<Offset>> _strokes = <List<Offset>>[];
  List<Offset> _current = <Offset>[];
  Size _canvasSize = Size.zero;

  List<List<Offset>> get strokes => [
        ..._strokes,
        if (_current.isNotEmpty) _current,
      ];

  bool get isEmpty => _strokes.isEmpty && _current.isEmpty;
  bool get isNotEmpty => !isEmpty;

  void start(Offset point, Size size) {
    _canvasSize = size;
    _current = <Offset>[point];
    notifyListeners();
  }

  void extend(Offset point) {
    _current.add(point);
    notifyListeners();
  }

  void end() {
    if (_current.isNotEmpty) {
      _strokes.add(List<Offset>.from(_current));
      _current = <Offset>[];
    }
    notifyListeners();
  }

  void clear() {
    _strokes.clear();
    _current = <Offset>[];
    notifyListeners();
  }

  /// Rend la signature en PNG sur fond transparent.
  Future<Uint8List?> toPngBytes({Color color = const Color(0xFF131A22)}) async {
    if (isEmpty || _canvasSize == Size.zero) return null;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      for (var i = 0; i < stroke.length - 1; i++) {
        canvas.drawLine(stroke[i], stroke[i + 1], paint);
      }
      if (stroke.length == 1) {
        canvas.drawPoints(ui.PointMode.points, stroke, paint);
      }
    }

    final picture = recorder.endRecording();
    final image = await picture.toImage(
      _canvasSize.width.toInt(),
      _canvasSize.height.toInt(),
    );
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return data?.buffer.asUint8List();
  }
}

/// Zone de signature client.
///
/// Toujours dans un ecran en mode client : aucune marge, aucun prix d'achat visible.
/// Compatible doigt **et** Apple Pencil.
class DsSignaturePad extends StatefulWidget {
  const DsSignaturePad({
    required this.controller,
    this.height = 220,
    this.hintText = 'Signez ici avec le doigt',
    this.footer,
    super.key,
  });

  final DsSignatureController controller;
  final double height;
  final String hintText;
  final Widget? footer;

  @override
  State<DsSignaturePad> createState() => _DsSignaturePadState();
}

class _DsSignaturePadState extends State<DsSignaturePad> {
  final GlobalKey _canvasKey = GlobalKey();

  Size get _size {
    final box = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    return box?.size ?? Size.zero;
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        final empty = widget.controller.isEmpty;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: widget.height,
              decoration: BoxDecoration(
                color: ds.surface1,
                borderRadius: DsRadius.cardAll,
                border: Border.all(
                  color: empty ? ds.borderStrong : ds.clientModeAccent,
                  width: empty ? 1 : 2,
                ),
              ),
              child: ClipRRect(
                borderRadius: DsRadius.cardAll,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: GestureDetector(
                        key: _canvasKey,
                        onPanStart: (details) => widget.controller
                            .start(details.localPosition, _size),
                        onPanUpdate: (details) =>
                            widget.controller.extend(details.localPosition),
                        onPanEnd: (_) {
                          widget.controller.end();
                          HapticFeedback.selectionClick();
                        },
                        child: CustomPaint(
                          painter: _DsSignaturePainter(
                            strokes: widget.controller.strokes,
                            color: ds.textPrimary,
                          ),
                          child: const SizedBox.expand(),
                        ),
                      ),
                    ),
                    if (empty)
                      IgnorePointer(
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              DsIcon(
                                DsGlyph.signature,
                                size: 34,
                                color: ds.textTertiary,
                              ),
                              const SizedBox(height: DsSpacing.s2),
                              Text(
                                widget.hintText,
                                style: TextStyle(
                                  fontSize: type.bodySize,
                                  color: ds.textTertiary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    Positioned(
                      right: DsSpacing.s2,
                      top: DsSpacing.s2,
                      child: TextButton.icon(
                        onPressed: empty
                            ? null
                            : () {
                                widget.controller.clear();
                                HapticFeedback.lightImpact();
                              },
                        icon: DsIcon(
                          DsGlyph.refresh,
                          size: 18,
                          color: empty ? ds.textTertiary : ds.brandPrimary,
                        ),
                        label: const Text('Effacer'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (widget.footer != null) ...[
              const SizedBox(height: DsSpacing.s4),
              widget.footer!,
            ],
          ],
        );
      },
    );
  }
}

class _DsSignaturePainter extends CustomPainter {
  const _DsSignaturePainter({required this.strokes, required this.color});

  final List<List<Offset>> strokes;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      for (var i = 0; i < stroke.length - 1; i++) {
        canvas.drawLine(stroke[i], stroke[i + 1], paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DsSignaturePainter oldDelegate) =>
      oldDelegate.strokes != strokes || oldDelegate.color != color;
}
