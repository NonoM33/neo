import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/tech_audit.dart';
import '../../blocs/tech_audit/tech_audit_bloc.dart';
import '../../blocs/tech_audit/tech_audit_event.dart';
import '../../blocs/tech_audit/tech_audit_state.dart';

class TechAuditScreen extends ConsumerStatefulWidget {
  final String appointmentId;
  final Map<String, dynamic>? existingMetadata;

  const TechAuditScreen({
    super.key,
    required this.appointmentId,
    this.existingMetadata,
  });

  @override
  ConsumerState<TechAuditScreen> createState() => _TechAuditScreenState();
}

class _TechAuditScreenState extends ConsumerState<TechAuditScreen> {
  late final TechAuditBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = ref.read(techAuditBlocProvider(widget.appointmentId));
    _bloc.add(TechAuditLoadRequested(
      appointmentId: widget.appointmentId,
      existingMetadata: widget.existingMetadata,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return BlocBuilder<TechAuditBloc, TechAuditState>(
      bloc: _bloc,
      builder: (context, state) {
        if (state is TechAuditLoading || state is TechAuditInitial) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Audit technique')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (state is TechAuditError) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Audit technique')),
            body: Center(child: Text(state.message)),
          );
        }

        if (state is! TechAuditLoaded) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Audit technique')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        return Scaffold(
          backgroundColor: cs.surface,
          appBar: AppBar(
            title: const Text('Audit technique'),
            actions: [
              if (state.isSaving)
                const Padding(
                  padding: EdgeInsets.only(right: 16),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              else if (state.lastSavedAt != null)
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Icon(Icons.cloud_done_rounded, size: 20, color: cs.onSurfaceVariant),
                ),
            ],
          ),
          body: isWide
              ? Row(
                  children: [
                    SizedBox(
                      width: 280,
                      child: _SectionsSidebar(
                        state: state,
                        onSectionTap: (i) => _bloc.add(TechAuditSectionSelected(i)),
                      ),
                    ),
                    VerticalDivider(
                      thickness: 1,
                      width: 1,
                      color: cs.outlineVariant.withAlpha(40),
                    ),
                    Expanded(
                      child: _SectionContent(
                        state: state,
                        bloc: _bloc,
                      ),
                    ),
                  ],
                )
              : Column(
                  children: [
                    // Progress bar on mobile
                    _ProgressBar(state: state),
                    Expanded(
                      child: _SectionContent(
                        state: state,
                        bloc: _bloc,
                      ),
                    ),
                  ],
                ),
          bottomNavigationBar: _buildBottomBar(context, state),
        );
      },
    );
  }

  Widget _buildBottomBar(BuildContext context, TechAuditLoaded state) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surface,
        border: Border(
          top: BorderSide(
            color: isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(40),
          ),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (!state.isFirstSection)
              OutlinedButton.icon(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  _bloc.add(const TechAuditPreviousSection());
                },
                icon: const Icon(Icons.chevron_left_rounded),
                label: const Text('Precedent'),
              )
            else
              const SizedBox(width: 120),
            const Spacer(),
            Text(
              '${state.currentSectionIndex + 1}/${state.totalSections} sections',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
            ),
            const Spacer(),
            if (state.isLastSection)
              FilledButton.icon(
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  _bloc.add(const TechAuditSaveRequested());
                  Navigator.of(context).pop();
                },
                icon: const Icon(Icons.check_circle_rounded),
                label: const Text('Terminer'),
              )
            else
              FilledButton.icon(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  _bloc.add(const TechAuditNextSection());
                },
                icon: const Icon(Icons.chevron_right_rounded),
                label: const Text('Suivant'),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

class _SectionsSidebar extends StatelessWidget {
  final TechAuditLoaded state;
  final ValueChanged<int> onSectionTap;

  const _SectionsSidebar({required this.state, required this.onSectionTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        // Progress header
        Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Progression',
                style: tt.labelMedium?.copyWith(color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: AppRadius.borderRadiusSm,
                child: LinearProgressIndicator(
                  value: state.auditData.progress,
                  minHeight: 8,
                  backgroundColor: cs.surfaceContainerHighest,
                  color: state.auditData.progress >= 1.0
                      ? AppTheme.successColor
                      : cs.primary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${state.auditData.progressPercent}%',
                style: tt.labelSmall?.copyWith(
                  color: cs.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        Divider(height: 1, color: isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(40)),
        // Section list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: TechAuditTemplate.sections.length,
            itemBuilder: (context, index) {
              final section = TechAuditTemplate.sections[index];
              final isSelected = index == state.currentSectionIndex;
              final sectionData = state.auditData.sections[section.id];
              final filled = sectionData?.filledCount(section.items) ?? 0;
              final total = section.items.length;
              final isComplete = filled == total && total > 0;

              return Material(
                color: isSelected
                    ? cs.primary.withAlpha(isDark ? 25 : 15)
                    : Colors.transparent,
                child: InkWell(
                  onTap: () => onSectionTap(index),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: isSelected
                        ? BoxDecoration(
                            border: Border(
                              left: BorderSide(color: cs.primary, width: 3),
                            ),
                          )
                        : null,
                    child: Row(
                      children: [
                        Icon(
                          _getSectionIcon(section.icon),
                          size: 18,
                          color: isSelected ? cs.primary : cs.onSurfaceVariant,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            section.title,
                            style: tt.bodySmall?.copyWith(
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              color: isSelected ? cs.primary : cs.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (isComplete)
                          Icon(Icons.check_circle_rounded, size: 16, color: AppTheme.successColor)
                        else
                          Text(
                            '$filled/$total',
                            style: tt.labelSmall?.copyWith(
                              color: cs.onSurfaceVariant,
                              fontSize: 10,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ─── Progress Bar (mobile) ────────────────────────────────────────────────

class _ProgressBar extends StatelessWidget {
  final TechAuditLoaded state;

  const _ProgressBar({required this.state});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: ClipRRect(
        borderRadius: AppRadius.borderRadiusSm,
        child: LinearProgressIndicator(
          value: state.auditData.progress,
          minHeight: 4,
          backgroundColor: cs.surfaceContainerHighest,
          color: cs.primary,
        ),
      ),
    );
  }
}

// ─── Section Content ──────────────────────────────────────────────────────

class _SectionContent extends StatelessWidget {
  final TechAuditLoaded state;
  final TechAuditBloc bloc;

  const _SectionContent({required this.state, required this.bloc});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final sectionDef = state.currentSectionDef;
    final sectionData = state.currentSectionData;

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        // Section header
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: cs.primary.withAlpha(15),
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(
                _getSectionIcon(sectionDef.icon),
                color: cs.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    sectionDef.title,
                    style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'Section ${state.currentSectionIndex + 1} sur ${state.totalSections}',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        // Items
        ...sectionDef.items.map((itemDef) {
          final value = sectionData.items[itemDef.id];
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _buildItemWidget(context, itemDef, value, sectionDef.id),
          );
        }),
        const SizedBox(height: 8),
        // Notes field
        _NotesField(
          sectionId: sectionDef.id,
          initialValue: sectionData.notes ?? '',
          bloc: bloc,
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildItemWidget(
    BuildContext context,
    AuditItemDef itemDef,
    dynamic value,
    String sectionId,
  ) {
    switch (itemDef.type) {
      case AuditItemType.check:
        return _CheckItem(
          itemDef: itemDef,
          value: value as bool? ?? false,
          onChanged: (v) => bloc.add(TechAuditItemUpdated(
            sectionId: sectionId,
            itemId: itemDef.id,
            value: v,
          )),
        );
      case AuditItemType.text:
        return _TextItem(
          itemDef: itemDef,
          value: value as String? ?? '',
          sectionId: sectionId,
          bloc: bloc,
        );
      case AuditItemType.number:
        return _NumberItem(
          itemDef: itemDef,
          value: value,
          sectionId: sectionId,
          bloc: bloc,
        );
      case AuditItemType.select:
        return _SelectItem(
          itemDef: itemDef,
          value: value as String?,
          onChanged: (v) => bloc.add(TechAuditItemUpdated(
            sectionId: sectionId,
            itemId: itemDef.id,
            value: v,
          )),
        );
      case AuditItemType.rating:
        return _RatingItem(
          itemDef: itemDef,
          value: value as String?,
          onChanged: (v) => bloc.add(TechAuditItemUpdated(
            sectionId: sectionId,
            itemId: itemDef.id,
            value: v,
          )),
        );
    }
  }
}

// ─── Item Widgets ─────────────────────────────────────────────────────────

class _CheckItem extends StatelessWidget {
  final AuditItemDef itemDef;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _CheckItem({required this.itemDef, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusMd,
        border: Border.all(
          color: value
              ? AppTheme.successColor.withAlpha(60)
              : (isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40)),
        ),
      ),
      child: SwitchListTile(
        title: Text(itemDef.label),
        subtitle: itemDef.hint != null ? Text(itemDef.hint!) : null,
        value: value,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          onChanged(v);
        },
        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderRadiusMd),
      ),
    );
  }
}

class _TextItem extends StatefulWidget {
  final AuditItemDef itemDef;
  final String value;
  final String sectionId;
  final TechAuditBloc bloc;

  const _TextItem({
    required this.itemDef,
    required this.value,
    required this.sectionId,
    required this.bloc,
  });

  @override
  State<_TextItem> createState() => _TextItemState();
}

class _TextItemState extends State<_TextItem> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(covariant _TextItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Only update if the text was changed externally (e.g., from a different section load)
    if (widget.value != oldWidget.value && widget.value != _controller.text) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: InputDecoration(
        labelText: widget.itemDef.label,
        hintText: widget.itemDef.hint,
        alignLabelWithHint: true,
        border: const OutlineInputBorder(),
      ),
      maxLines: widget.itemDef.id.contains('recommandations') ||
              widget.itemDef.id.contains('points_attention') ||
              widget.itemDef.id.contains('prochaines_etapes') ||
              widget.itemDef.id.contains('remarques')
          ? 4
          : 1,
      onChanged: (v) {
        widget.bloc.add(TechAuditItemUpdated(
          sectionId: widget.sectionId,
          itemId: widget.itemDef.id,
          value: v,
        ));
      },
    );
  }
}

class _NumberItem extends StatefulWidget {
  final AuditItemDef itemDef;
  final dynamic value;
  final String sectionId;
  final TechAuditBloc bloc;

  const _NumberItem({
    required this.itemDef,
    required this.value,
    required this.sectionId,
    required this.bloc,
  });

  @override
  State<_NumberItem> createState() => _NumberItemState();
}

class _NumberItemState extends State<_NumberItem> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: widget.value != null ? widget.value.toString() : '',
    );
  }

  @override
  void didUpdateWidget(covariant _NumberItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    final newText = widget.value != null ? widget.value.toString() : '';
    if (newText != _controller.text) {
      _controller.text = newText;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: InputDecoration(
        labelText: widget.itemDef.label,
        hintText: widget.itemDef.hint,
        border: const OutlineInputBorder(),
      ),
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      onChanged: (v) {
        final num = int.tryParse(v);
        if (num != null) {
          widget.bloc.add(TechAuditItemUpdated(
            sectionId: widget.sectionId,
            itemId: widget.itemDef.id,
            value: num,
          ));
        }
      },
    );
  }
}

class _SelectItem extends StatelessWidget {
  final AuditItemDef itemDef;
  final String? value;
  final ValueChanged<String> onChanged;

  const _SelectItem({required this.itemDef, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final options = itemDef.options ?? [];

    if (options.length <= 4) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            itemDef.label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: options.map((option) {
              final isSelected = value == option;
              return ChoiceChip(
                label: Text(option),
                selected: isSelected,
                onSelected: (_) {
                  HapticFeedback.selectionClick();
                  onChanged(option);
                },
              );
            }).toList(),
          ),
        ],
      );
    }

    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: InputDecoration(
        labelText: itemDef.label,
        border: const OutlineInputBorder(),
      ),
      items: options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
    );
  }
}

class _RatingItem extends StatelessWidget {
  final AuditItemDef itemDef;
  final String? value;
  final ValueChanged<String> onChanged;

  const _RatingItem({required this.itemDef, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          itemDef.label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _ratingChip(context, 'Bon', AppTheme.successColor, value == 'Bon'),
            const SizedBox(width: 8),
            _ratingChip(context, 'Moyen', AppTheme.warningColor, value == 'Moyen'),
            const SizedBox(width: 8),
            _ratingChip(context, 'Mauvais', AppTheme.errorColor, value == 'Mauvais'),
          ],
        ),
      ],
    );
  }

  Widget _ratingChip(BuildContext context, String label, Color color, bool selected) {
    return Expanded(
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        selectedColor: color.withAlpha(40),
        labelStyle: TextStyle(
          color: selected ? color : Theme.of(context).colorScheme.onSurface,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
        ),
        side: BorderSide(
          color: selected ? color : Theme.of(context).colorScheme.outlineVariant,
        ),
        showCheckmark: false,
        onSelected: (_) {
          HapticFeedback.selectionClick();
          onChanged(label);
        },
      ),
    );
  }
}

class _NotesField extends StatefulWidget {
  final String sectionId;
  final String initialValue;
  final TechAuditBloc bloc;

  const _NotesField({
    required this.sectionId,
    required this.initialValue,
    required this.bloc,
  });

  @override
  State<_NotesField> createState() => _NotesFieldState();
}

class _NotesFieldState extends State<_NotesField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void didUpdateWidget(covariant _NotesField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.sectionId != oldWidget.sectionId) {
      _controller.text = widget.initialValue;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return TextField(
      controller: _controller,
      decoration: InputDecoration(
        labelText: 'Notes de section',
        hintText: 'Observations, remarques...',
        alignLabelWithHint: true,
        border: const OutlineInputBorder(),
        prefixIcon: const Icon(Icons.note_alt_outlined),
        filled: true,
        fillColor: cs.surfaceContainerLowest,
      ),
      maxLines: 3,
      onChanged: (v) {
        widget.bloc.add(TechAuditNotesUpdated(
          sectionId: widget.sectionId,
          notes: v,
        ));
      },
    );
  }
}

// ─── Icon mapping ─────────────────────────────────────────────────────────

IconData _getSectionIcon(String iconName) {
  switch (iconName) {
    case 'door_front':
      return Icons.door_front_door_outlined;
    case 'home':
      return Icons.home_outlined;
    case 'bolt':
      return Icons.bolt_outlined;
    case 'wifi':
      return Icons.wifi_rounded;
    case 'lightbulb':
      return Icons.lightbulb_outline_rounded;
    case 'blinds':
      return Icons.blinds_rounded;
    case 'thermostat':
      return Icons.thermostat_rounded;
    case 'shield':
      return Icons.shield_outlined;
    case 'tv':
      return Icons.tv_rounded;
    case 'yard':
      return Icons.yard_outlined;
    case 'priority_high':
      return Icons.priority_high_rounded;
    case 'summarize':
      return Icons.summarize_outlined;
    default:
      return Icons.circle_outlined;
  }
}
