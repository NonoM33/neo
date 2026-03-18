import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../domain/entities/floor_plan.dart';
import '../../../domain/entities/product.dart';
import '../../blocs/floor_plan/floor_plan_bloc.dart';
import '../../blocs/floor_plan/floor_plan_event.dart';
import '../../blocs/floor_plan/floor_plan_state.dart';
import 'floor_plan_painter.dart';
import 'plan_hit_tester.dart';

/// Interactive floor plan canvas with zoom/pan and gesture handling
class FloorPlanCanvas extends StatefulWidget {
  final FloorPlanLoaded state;
  final FloorPlanBloc bloc;
  final Map<String, Product> productCache;
  final String? selectedProductIdForPlacement;

  const FloorPlanCanvas({
    super.key,
    required this.state,
    required this.bloc,
    this.productCache = const {},
    this.selectedProductIdForPlacement,
  });

  @override
  State<FloorPlanCanvas> createState() => _FloorPlanCanvasState();
}

class _FloorPlanCanvasState extends State<FloorPlanCanvas> {
  final TransformationController _transformController =
      TransformationController();

  // Wall drawing state
  Offset? _wallStart; // in plan meters
  Offset? _wallEnd; // in plan meters (preview)

  // Drag-to-move state (handled via Listener for touch compatibility)
  String? _draggingElementId;
  ElementType? _draggingElementType;

  @override
  void dispose() {
    _transformController.dispose();
    super.dispose();
  }

  FloorPlan get plan => widget.state.plan;
  double get ppm => plan.pixelsPerMeter;

  /// Convert screen position to plan coordinates (meters)
  Offset _screenToPlan(Offset screenPos) {
    final matrix = _transformController.value;
    final inverted = Matrix4.inverted(matrix);
    final canvasPos = MatrixUtils.transformPoint(inverted, screenPos);
    return Offset(canvasPos.dx / ppm, canvasPos.dy / ppm);
  }

  void _handleTapDown(TapDownDetails details) {
    final planPoint = _screenToPlan(details.localPosition);
    final tool = widget.state.activeTool;

    switch (tool) {
      case PlanTool.select:
        _handleSelect(planPoint);
      case PlanTool.wall:
        _handleWallTap(planPoint);
      case PlanTool.door:
        _handleOpeningTap(planPoint, OpeningType.door);
      case PlanTool.window:
        _handleOpeningTap(planPoint, OpeningType.window);
      case PlanTool.equipment:
        _handleEquipmentTap(planPoint);
      case PlanTool.annotation:
        _handleAnnotationTap(planPoint);
      case PlanTool.measurement:
        _handleMeasurementTap(planPoint);
      case PlanTool.eraser:
        _handleErase(planPoint);
    }
  }

  // ─── Pointer event handlers (bypass gesture arena for reliable touch drag) ──

  void _onPointerDown(PointerDownEvent event) {
    if (widget.state.activeTool != PlanTool.select) return;
    final planPoint = _screenToPlan(event.localPosition);
    final hit = PlanHitTester.hitTest(plan, planPoint);
    if (hit != null &&
        (hit.elementType == ElementType.equipment ||
            hit.elementType == ElementType.annotation)) {
      if (widget.state.selectedElementId != hit.elementId) {
        widget.bloc.add(FloorPlanElementSelected(
          elementId: hit.elementId,
          elementType: hit.elementType,
        ));
      }
      setState(() {
        _draggingElementId = hit.elementId;
        _draggingElementType = hit.elementType;
      });
    }
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (_draggingElementId == null) return;
    final planPoint = _screenToPlan(event.localPosition);
    final snapped = PlanHitTester.snapToGrid(planPoint);
    if (_draggingElementType == ElementType.equipment) {
      widget.bloc.add(EquipmentMoveRequested(
        equipmentId: _draggingElementId!,
        newPosition: snapped,
      ));
    } else if (_draggingElementType == ElementType.annotation) {
      widget.bloc.add(AnnotationMoveRequested(
        annotationId: _draggingElementId!,
        newPosition: snapped,
      ));
    }
  }

  void _onPointerUp(PointerUpEvent event) {
    if (_draggingElementId != null) {
      HapticFeedback.lightImpact();
      setState(() {
        _draggingElementId = null;
        _draggingElementType = null;
      });
    }
  }

  void _onPointerCancel(PointerCancelEvent event) {
    if (_draggingElementId != null) {
      setState(() {
        _draggingElementId = null;
        _draggingElementType = null;
      });
    }
  }

  // ─── Wall/measurement pan handlers ────────────────────────────

  void _handlePanUpdate(DragUpdateDetails details) {
    if (widget.state.activeTool == PlanTool.wall && _wallStart != null) {
      final planPoint = _screenToPlan(details.localPosition);
      final snapped = PlanHitTester.snapToGrid(
        planPoint,
        snapPoints: PlanHitTester.getWallEndpoints(plan),
      );
      setState(() => _wallEnd = snapped);
    }
  }

  void _handlePanEnd(DragEndDetails details) {
    if (widget.state.activeTool == PlanTool.wall &&
        _wallStart != null &&
        _wallEnd != null) {
      if ((_wallEnd! - _wallStart!).distance > 0.1) {
        widget.bloc.add(WallAddRequested(
          startPoint: _wallStart!,
          endPoint: _wallEnd!,
        ));
        HapticFeedback.lightImpact();
      }
      setState(() {
        _wallStart = null;
        _wallEnd = null;
      });
    }
  }

  // ─── Tool handlers ────────────────────────────────────────────

  void _handleSelect(Offset planPoint) {
    final hit = PlanHitTester.hitTest(plan, planPoint);
    if (hit != null) {
      HapticFeedback.selectionClick();
      widget.bloc.add(FloorPlanElementSelected(
        elementId: hit.elementId,
        elementType: hit.elementType,
      ));
    } else {
      widget.bloc.add(const FloorPlanElementSelected());
    }
  }

  void _handleWallTap(Offset planPoint) {
    final snapped = PlanHitTester.snapToGrid(
      planPoint,
      snapPoints: PlanHitTester.getWallEndpoints(plan),
    );

    if (_wallStart == null) {
      setState(() => _wallStart = snapped);
    } else {
      if ((snapped - _wallStart!).distance > 0.1) {
        widget.bloc.add(WallAddRequested(
          startPoint: _wallStart!,
          endPoint: snapped,
        ));
        HapticFeedback.lightImpact();
      }
      // Chain: new wall starts from end of previous
      setState(() {
        _wallStart = snapped;
        _wallEnd = null;
      });
    }
  }

  void _handleOpeningTap(Offset planPoint, OpeningType type) {
    final nearest = PlanHitTester.findNearestWall(plan, planPoint);
    if (nearest == null) return;

    widget.bloc.add(OpeningAddRequested(
      wallId: nearest.wallId,
      type: type,
      offsetOnWall: nearest.offset,
      widthMeters: type == OpeningType.window ? 1.2 : 0.9,
    ));
    HapticFeedback.lightImpact();
  }

  void _handleEquipmentTap(Offset planPoint) {
    final productId = widget.selectedProductIdForPlacement;
    if (productId == null) {
      // Show hint snackbar
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sélectionnez d\'abord un produit dans le catalogue à droite'),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    final snapped = PlanHitTester.snapToGrid(planPoint);
    widget.bloc.add(EquipmentPlaceRequested(
      productId: productId,
      position: snapped,
    ));
    HapticFeedback.lightImpact();
  }

  void _handleAnnotationTap(Offset planPoint) {
    _showAnnotationDialog(planPoint);
  }

  void _handleMeasurementTap(Offset planPoint) {
    // Simple: add measurement between two taps (reuse wall start logic)
    if (_wallStart == null) {
      setState(() => _wallStart = planPoint);
    } else {
      if ((planPoint - _wallStart!).distance > 0.05) {
        final length = (planPoint - _wallStart!).distance;
        widget.bloc.add(AnnotationAddRequested(
          position: _wallStart!,
          type: AnnotationType.measurement,
          text: '${length.toStringAsFixed(2)}m',
          endPosition: planPoint,
        ));
      }
      setState(() {
        _wallStart = null;
        _wallEnd = null;
      });
    }
  }

  void _handleErase(Offset planPoint) {
    final hit = PlanHitTester.hitTest(plan, planPoint);
    if (hit != null) {
      HapticFeedback.lightImpact();
      switch (hit.elementType) {
        case ElementType.wall:
          widget.bloc.add(WallDeleteRequested(hit.elementId));
        case ElementType.opening:
          widget.bloc.add(OpeningDeleteRequested(hit.elementId));
        case ElementType.equipment:
          widget.bloc.add(EquipmentDeleteRequested(hit.elementId));
        case ElementType.annotation:
          widget.bloc.add(AnnotationDeleteRequested(hit.elementId));
      }
    }
  }

  void _showAnnotationDialog(Offset planPoint) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ajouter une note'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Texte',
            hintText: 'Ex: Passage de cable ici',
          ),
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) {
            if (controller.text.trim().isNotEmpty) {
              widget.bloc.add(AnnotationAddRequested(
                position: planPoint,
                type: AnnotationType.note,
                text: controller.text.trim(),
              ));
              Navigator.pop(ctx);
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                widget.bloc.add(AnnotationAddRequested(
                  position: planPoint,
                  type: AnnotationType.note,
                  text: controller.text.trim(),
                ));
                Navigator.pop(ctx);
              }
            },
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
  }

  // ─── Build ────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final canvasWidth = plan.widthMeters * ppm;
    final canvasHeight = plan.heightMeters * ppm;
    final isWallTool = widget.state.activeTool == PlanTool.wall ||
        widget.state.activeTool == PlanTool.measurement;

    return ClipRect(
      child: Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: _onPointerDown,
        onPointerMove: _onPointerMove,
        onPointerUp: _onPointerUp,
        onPointerCancel: _onPointerCancel,
        child: InteractiveViewer(
          transformationController: _transformController,
          constrained: false,
          boundaryMargin: const EdgeInsets.all(200),
          minScale: 0.3,
          maxScale: 3.0,
          panEnabled: _draggingElementId == null &&
              (!isWallTool || _wallStart == null),
          child: GestureDetector(
            onTapDown: _handleTapDown,
            onPanUpdate: isWallTool ? _handlePanUpdate : null,
            onPanEnd: isWallTool ? _handlePanEnd : null,
            child: SizedBox(
              width: canvasWidth + 100,
              height: canvasHeight + 100,
              child: Padding(
                padding: const EdgeInsets.all(50),
                child: CustomPaint(
                  size: Size(canvasWidth, canvasHeight),
                  painter: FloorPlanPainter(
                    plan: plan,
                    pixelsPerMeter: ppm,
                    selectedElementId: widget.state.selectedElementId,
                    activeTool: widget.state.activeTool,
                    ghostStart: _wallStart,
                    ghostEnd: _wallEnd,
                    productCache: widget.productCache,
                    colorScheme: colorScheme,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

      ),
    ),
  );
  }
}
