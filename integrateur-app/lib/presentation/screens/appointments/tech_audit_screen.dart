import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/tech_audit.dart';
import '../../../routes/app_router.dart';
import '../../blocs/tech_audit/tech_audit_bloc.dart';
import '../../blocs/tech_audit/tech_audit_event.dart';
import '../../blocs/tech_audit/tech_audit_state.dart';
import '../../widgets/ds/ds.dart';

/// Audit technique — questionnaire structure rempli pendant la visite.
///
/// **12 sections, ~60 questions** : le vrai risque est la fatigue et l'abandon.
/// La progression est donc permanente, la sauvegarde continue, et on peut
/// sauter une section puis y revenir.
/// iPad paysage : sommaire des sections a gauche + section courante a droite.
/// iPhone : une section par ecran, progression collante en haut.
class TechAuditScreen extends ConsumerStatefulWidget {
  const TechAuditScreen({required this.appointmentId, super.key});

  final String appointmentId;

  @override
  ConsumerState<TechAuditScreen> createState() => _TechAuditScreenState();
}

class _TechAuditScreenState extends ConsumerState<TechAuditScreen> {
  @override
  void initState() {
    super.initState();
    ref
        .read(techAuditBlocProvider(widget.appointmentId))
        .add(TechAuditLoadRequested(appointmentId: widget.appointmentId));
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(techAuditBlocProvider(widget.appointmentId));
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<TechAuditBloc, TechAuditState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is TechAuditError) {
            showDsSnackbar(context, message: state.message, tone: DsTone.error);
          }
        },
        builder: (context, state) {
          if (state is TechAuditLoading || state is TechAuditInitial) {
            return const SafeArea(child: DsSkeletonDetail());
          }
          if (state is TechAuditError) {
            return SafeArea(
              child: DsErrorState(
                kind: DsErrorKind.fromMessage(state.message),
                action: DsButton(
                  label: 'Réessayer',
                  icon: DsGlyph.refresh,
                  onPressed: () => bloc.add(
                    TechAuditLoadRequested(appointmentId: widget.appointmentId),
                  ),
                ),
              ),
            );
          }
          if (state is! TechAuditLoaded) return const SizedBox.shrink();

          final sections = TechAuditTemplate.sections;
          final index = state.currentSectionIndex.clamp(0, sections.length - 1);
          final section = sections[index];
          final data = state.auditData.sections[section.id] ??
              const AuditSectionData();

          final content = _SectionForm(
            section: section,
            data: data,
            bloc: bloc,
          );

          return Column(
            children: [
              DsAppBar(
                immersive: true,
                title: 'Audit technique',
                subtitle:
                    'Section ${index + 1} sur ${sections.length} · ${state.auditData.progressPercent} % complété',
                backLabel: 'Retour au rendez-vous',
                onBack: () =>
                    context.goToAppointmentDetail(widget.appointmentId),
                actions: [
                  DsIconButton(
                    icon: state.isSaving ? DsGlyph.sync : Icons.save_rounded,
                    label: 'Enregistrer',
                    onPressed: state.isSaving
                        ? null
                        : () => bloc.add(const TechAuditSaveRequested()),
                  ),
                ],
              ),
              Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: DsSpacing.pagePadding(device),
                  vertical: DsSpacing.s3,
                ),
                child: DsAuditProgress(
                  label: 'Progression',
                  percent: state.auditData.progressPercent,
                ),
              ),
              Expanded(
                child: device.isDesktop && context.dsIsLandscape
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 300,
                            child: _Summary(
                              sections: sections,
                              current: index,
                              state: state,
                              onSelect: (value) =>
                                  bloc.add(TechAuditSectionSelected(value)),
                            ),
                          ),
                          VerticalDivider(width: 1, color: ds.borderSubtle),
                          Expanded(child: content),
                        ],
                      )
                    : content,
              ),
              _Pager(
                index: index,
                total: sections.length,
                bloc: bloc,
                onFinish: () {
                  bloc.add(const TechAuditSaveRequested());
                  context.goToAppointmentDetail(widget.appointmentId);
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({
    required this.sections,
    required this.current,
    required this.state,
    required this.onSelect,
  });

  final List<AuditSectionDef> sections;
  final int current;
  final TechAuditLoaded state;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return ListView.separated(
      padding: const EdgeInsets.all(DsSpacing.s4),
      itemCount: sections.length,
      separatorBuilder: (_, _) => const SizedBox(height: DsSpacing.s2),
      itemBuilder: (context, index) {
        final section = sections[index];
        final data = state.auditData.sections[section.id];
        final filled = data?.items.values.where((v) => v != null).length ?? 0;
        final complete = filled >= section.items.length;

        return DsCard(
          selected: index == current,
          onTap: () => onSelect(index),
          padding: const EdgeInsets.symmetric(
            horizontal: DsSpacing.s4,
            vertical: DsSpacing.s3,
          ),
          child: Row(
            children: [
              DsIcon(
                complete ? DsGlyph.checkCircle : DsGlyph.pending,
                size: 20,
                color: complete ? ds.success : ds.textTertiary,
              ),
              const SizedBox(width: DsSpacing.s3),
              Expanded(
                child: Text(
                  section.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: t.labelSize,
                    fontWeight: DsWeight.semibold,
                    color: ds.textPrimary,
                  ),
                ),
              ),
              Text(
                '$filled/${section.items.length}',
                style: TextStyle(
                  fontSize: t.badgeSize,
                  fontFeatures: dsTabularFigures,
                  color: ds.textSecondary,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SectionForm extends StatelessWidget {
  const _SectionForm({
    required this.section,
    required this.data,
    required this.bloc,
  });

  final AuditSectionDef section;
  final AuditSectionData data;
  final TechAuditBloc bloc;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final padding = DsSpacing.pagePadding(context.dsDevice);

    void update(String itemId, Object? value) => bloc.add(
          TechAuditItemUpdated(
            sectionId: section.id,
            itemId: itemId,
            value: value,
          ),
        );

    return ListView(
      padding: EdgeInsets.fromLTRB(padding, 0, padding, DsSpacing.s8),
      children: [
        Text(
          section.title,
          style: TextStyle(
            fontSize: t.h2Size,
            fontWeight: DsWeight.semibold,
            letterSpacing: -0.4,
            color: ds.textPrimary,
          ),
        ),
        const SizedBox(height: DsSpacing.s5),
        for (final item in section.items) ...[
          switch (item.type) {
            AuditItemType.check => DsToggle(
                label: item.label,
                value: data.items[item.id] == true,
                onChanged: (value) => update(item.id, value),
              ),
            AuditItemType.rating => DsRatingScale(
                label: item.label,
                value: (data.items[item.id] as num?)?.toInt(),
                onChanged: (value) => update(item.id, value),
              ),
            AuditItemType.select => DsSelectField<String>(
                label: item.label,
                value: data.items[item.id] as String?,
                hintText: 'Choisir…',
                items: [
                  for (final option in item.options ?? const <String>[])
                    DsSelectItem(value: option, label: option),
                ],
                onChanged: (value) => update(item.id, value),
              ),
            AuditItemType.number => _NumberItem(
                item: item,
                value: (data.items[item.id] as num?)?.toInt() ?? 0,
                onChanged: (value) => update(item.id, value),
              ),
            AuditItemType.text => _TextItem(
                item: item,
                value: data.items[item.id] as String?,
                onChanged: (value) => update(item.id, value),
              ),
          },
          const SizedBox(height: DsSpacing.s4),
        ],
        const SizedBox(height: DsSpacing.s2),
        _TextItem(
          item: AuditItemDef(
            id: '${section.id}__notes',
            label: 'Notes de section',
            type: AuditItemType.text,
            hint: 'Observations, remarques…',
          ),
          value: data.notes,
          onChanged: (value) => bloc.add(
            TechAuditNotesUpdated(sectionId: section.id, notes: value),
          ),
        ),
      ],
    );
  }
}

class _NumberItem extends StatelessWidget {
  const _NumberItem({
    required this.item,
    required this.value,
    required this.onChanged,
  });

  final AuditItemDef item;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Row(
      children: [
        Expanded(
          child: Text(
            item.label,
            style: TextStyle(
              fontSize: t.bodySize,
              fontWeight: DsWeight.medium,
              color: ds.textBody,
            ),
          ),
        ),
        const SizedBox(width: DsSpacing.s3),
        DsNumberStepper(value: value, max: 99, onChanged: onChanged),
      ],
    );
  }
}

class _TextItem extends StatefulWidget {
  const _TextItem({
    required this.item,
    required this.value,
    required this.onChanged,
  });

  final AuditItemDef item;
  final String? value;
  final ValueChanged<String> onChanged;

  @override
  State<_TextItem> createState() => _TextItemState();
}

class _TextItemState extends State<_TextItem> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.value ?? '');

  @override
  void didUpdateWidget(covariant _TextItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.id != widget.item.id) {
      _controller.text = widget.value ?? '';
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DsTextField(
      label: widget.item.label,
      controller: _controller,
      hintText: widget.item.hint,
      maxLines: 3,
      minLines: 1,
      textInputAction: TextInputAction.newline,
      onChanged: widget.onChanged,
    );
  }
}

class _Pager extends StatelessWidget {
  const _Pager({
    required this.index,
    required this.total,
    required this.bloc,
    required this.onFinish,
  });

  final int index;
  final int total;
  final TechAuditBloc bloc;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final last = index >= total - 1;

    return Container(
      padding: EdgeInsets.all(DsSpacing.pagePadding(context.dsDevice)),
      decoration: BoxDecoration(
        color: ds.surface1,
        border: Border(top: BorderSide(color: ds.borderDefault)),
        boxShadow: ds.elevationSticky,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: DsButton(
                label: 'Précédent',
                icon: Icons.chevron_left_rounded,
                variant: DsButtonVariant.secondary,
                fullWidth: true,
                onPressed: index == 0
                    ? null
                    : () => bloc.add(const TechAuditPreviousSection()),
              ),
            ),
            const SizedBox(width: DsSpacing.s3),
            Expanded(
              flex: 2,
              child: DsButton(
                label: last ? 'Terminer l’audit' : 'Section suivante',
                icon: last ? DsGlyph.checkCircle : Icons.chevron_right_rounded,
                size: DsButtonSize.large,
                fullWidth: true,
                onPressed: last
                    ? onFinish
                    : () => bloc.add(const TechAuditNextSection()),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
