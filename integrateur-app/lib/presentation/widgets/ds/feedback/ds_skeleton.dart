import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';

/// Squelettes de chargement — **aucun spinner centre** dans l'app.
///
/// Cinq formes, comme prevu par le systeme : liste, grille, detail, plan, conversation.
class DsSkeleton extends StatelessWidget {
  const DsSkeleton({
    this.width,
    this.height = 16,
    this.radius = DsRadius.sm,
    super.key,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Shimmer.fromColors(
      baseColor: ds.surfaceSunken,
      highlightColor: ds.isDark ? ds.surface3 : ds.surface1,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: ds.surfaceSunken,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

/// Squelette d'une card de liste (avatar + deux lignes + badge).
class DsSkeletonListItem extends StatelessWidget {
  const DsSkeletonListItem({super.key});

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Container(
      padding: const EdgeInsets.all(DsSpacing.cardPadding),
      decoration: BoxDecoration(
        color: ds.surfaceCard,
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: ds.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const DsSkeleton(width: 48, height: 48, radius: DsRadius.full),
              const SizedBox(width: DsSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const DsSkeleton(width: 180, height: 17),
                    const SizedBox(height: DsSpacing.s2),
                    DsSkeleton(width: 120, height: 13, radius: DsRadius.xs),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DsSpacing.s3),
          const DsSkeleton(width: 96, height: 24, radius: DsRadius.sm),
        ],
      ),
    );
  }
}

/// Liste de squelettes.
class DsSkeletonList extends StatelessWidget {
  const DsSkeletonList({this.count = 5, this.padding, super.key});

  final int count;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: padding ?? DsSpacing.page(context.dsDevice),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: DsSpacing.gapCard),
      itemBuilder: (_, _) => const DsSkeletonListItem(),
    );
  }
}

/// Grille de squelettes (catalogue, projets en grille).
class DsSkeletonGrid extends StatelessWidget {
  const DsSkeletonGrid({
    this.count = 6,
    this.crossAxisCount = 2,
    this.aspectRatio = 0.85,
    this.padding,
    super.key,
  });

  final int count;
  final int crossAxisCount;
  final double aspectRatio;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return GridView.builder(
      padding: padding ?? DsSpacing.page(context.dsDevice),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: aspectRatio,
        mainAxisSpacing: DsSpacing.gapCard,
        crossAxisSpacing: DsSpacing.gapCard,
      ),
      itemCount: count,
      itemBuilder: (_, _) => Container(
        decoration: BoxDecoration(
          color: ds.surfaceCard,
          borderRadius: DsRadius.cardAll,
          border: Border.all(color: ds.borderSubtle),
        ),
        padding: const EdgeInsets.all(DsSpacing.s3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Expanded(
              child: DsSkeleton(
                width: double.infinity,
                height: double.infinity,
                radius: DsRadius.md,
              ),
            ),
            const SizedBox(height: DsSpacing.s3),
            const DsSkeleton(width: double.infinity, height: 15),
            const SizedBox(height: DsSpacing.s2),
            DsSkeleton(width: 80, height: 13, radius: DsRadius.xs),
          ],
        ),
      ),
    );
  }
}

/// Squelette d'un ecran de detail (en-tete + sections).
class DsSkeletonDetail extends StatelessWidget {
  const DsSkeletonDetail({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: DsSpacing.page(context.dsDevice),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const DsSkeleton(width: 64, height: 64, radius: DsRadius.full),
              const SizedBox(width: DsSpacing.s4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const DsSkeleton(width: 220, height: 28),
                    const SizedBox(height: DsSpacing.s2),
                    const DsSkeleton(width: 160, height: 15),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DsSpacing.gapSection),
          const DsSkeleton(width: double.infinity, height: 120, radius: DsRadius.lg),
          const SizedBox(height: DsSpacing.gapCard),
          const DsSkeleton(width: double.infinity, height: 88, radius: DsRadius.lg),
          const SizedBox(height: DsSpacing.gapCard),
          const DsSkeleton(width: double.infinity, height: 88, radius: DsRadius.lg),
        ],
      ),
    );
  }
}

/// Squelette d'une conversation (ticket).
class DsSkeletonConversation extends StatelessWidget {
  const DsSkeletonConversation({this.count = 4, super.key});

  final int count;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: DsSpacing.page(context.dsDevice),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: DsSpacing.gapCard),
      itemBuilder: (_, index) => Align(
        alignment: index.isEven ? Alignment.centerLeft : Alignment.centerRight,
        child: FractionallySizedBox(
          widthFactor: 0.72,
          child: DsSkeleton(
            width: double.infinity,
            height: index.isEven ? 72 : 56,
            radius: DsRadius.lg,
          ),
        ),
      ),
    );
  }
}

/// Squelette du canvas de plan.
class DsSkeletonPlan extends StatelessWidget {
  const DsSkeletonPlan({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: DsSpacing.page(context.dsDevice),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DsSkeleton(width: 56, height: 320, radius: DsRadius.lg),
          const SizedBox(width: DsSpacing.gapCard),
          const Expanded(
            child: DsSkeleton(
              width: double.infinity,
              height: 320,
              radius: DsRadius.lg,
            ),
          ),
        ],
      ),
    );
  }
}
