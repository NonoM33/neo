import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import '../core/ds_icon_button.dart';

enum DsPhotoState { ready, uploading, failed }

/// Vignette photo.
///
/// L'image est **une preuve technique** prise par l'utilisateur : ni filtre,
/// ni teinte, ni recadrage artistique. La legende est protegee par un degrade.
class DsPhotoThumb extends StatelessWidget {
  const DsPhotoThumb({
    this.imageUrl,
    this.filePath,
    this.caption,
    this.state = DsPhotoState.ready,
    this.progress,
    this.onTap,
    this.onDelete,
    this.onRetry,
    super.key,
  });

  final String? imageUrl;
  final String? filePath;
  final String? caption;
  final DsPhotoState state;

  /// 0 a 100.
  final int? progress;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    Widget image() {
      if (filePath != null) {
        return Image.file(File(filePath!), fit: BoxFit.cover);
      }
      if (imageUrl != null && imageUrl!.isNotEmpty) {
        return CachedNetworkImage(
          imageUrl: imageUrl!,
          fit: BoxFit.cover,
          errorWidget: (_, _, _) => _placeholder(ds),
        );
      }
      return _placeholder(ds);
    }

    return ClipRRect(
      borderRadius: DsRadius.mdAll,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(child: image()),
          if (state == DsPhotoState.uploading)
            Positioned.fill(
              child: ColoredBox(
                color: const Color(0xCC131A22),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox.square(
                        dimension: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          value: progress == null ? null : progress! / 100,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: DsSpacing.s2),
                      Text(
                        progress == null ? 'Envoi…' : 'Envoi $progress %',
                        style: TextStyle(
                          fontSize: type.badgeSize,
                          fontWeight: DsWeight.semibold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (state == DsPhotoState.failed)
            Positioned.fill(
              child: ColoredBox(
                color: ds.soft(ds.error, 0.86),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DsIcon(DsGlyph.cloudOff, size: 24, color: ds.error),
                      const SizedBox(height: 4),
                      TextButton(
                        onPressed: onRetry,
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (caption != null && state == DsPhotoState.ready)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(8, 16, 8, 6),
                decoration: BoxDecoration(gradient: ds.gradientProtectBottom),
                child: Text(
                  caption!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: type.badgeSize,
                    fontWeight: DsWeight.semibold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          if (onDelete != null && state != DsPhotoState.uploading)
            Positioned(
              top: 0,
              right: 0,
              child: DsIconButton(
                icon: DsGlyph.close,
                label: 'Supprimer la photo',
                tone: Colors.white,
                filled: true,
                onPressed: onDelete,
              ),
            ),
          if (onTap != null)
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(onTap: onTap),
              ),
            ),
        ],
      ),
    );
  }

  Widget _placeholder(DsColors ds) => ColoredBox(
        color: ds.surfaceSunken,
        child: Center(
          child: DsIcon(DsGlyph.photo, size: 28, color: ds.textTertiary),
        ),
      );
}
