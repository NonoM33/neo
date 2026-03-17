import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/appointment.dart';
import '../../../routes/app_router.dart';
import '../../blocs/appointments/appointments_bloc.dart';
import '../../blocs/appointments/appointments_event.dart';
import '../../blocs/appointments/appointments_state.dart';

class AppointmentDetailScreen extends ConsumerStatefulWidget {
  final String appointmentId;

  const AppointmentDetailScreen({super.key, required this.appointmentId});

  @override
  ConsumerState<AppointmentDetailScreen> createState() => _AppointmentDetailScreenState();
}

class _AppointmentDetailScreenState extends ConsumerState<AppointmentDetailScreen> {
  late final AppointmentsBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = ref.read(appointmentDetailBlocProvider(widget.appointmentId));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bloc = ref.watch(appointmentDetailBlocProvider(widget.appointmentId));

    return BlocConsumer<AppointmentsBloc, AppointmentsState>(
      bloc: bloc,
      listener: (context, state) {
        if (state is AppointmentOperationSuccess) {
          context.showSuccessSnackBar(state.message);
          // Reload detail
          _bloc.add(AppointmentLoadRequested(widget.appointmentId));
        } else if (state is AppointmentsError) {
          context.showErrorSnackBar(state.message);
        }
      },
      builder: (context, state) {
        if (state is AppointmentsLoading || state is AppointmentsInitial) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Rendez-vous')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (state is AppointmentsError) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Rendez-vous')),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline_rounded, size: 48, color: cs.error),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  FilledButton.tonalIcon(
                    onPressed: () => bloc.add(AppointmentLoadRequested(widget.appointmentId)),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Reessayer'),
                  ),
                ],
              ),
            ),
          );
        }

        if (state is! AppointmentDetailLoaded) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Rendez-vous')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        return _buildContent(context, state.appointment);
      },
    );
  }

  Widget _buildContent(BuildContext context, Appointment appointment) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: Text(appointment.title),
        actions: [
          if (appointment.status.isActive)
            PopupMenuButton<String>(
              tooltip: 'Actions',
              onSelected: (value) {
                HapticFeedback.lightImpact();
                _handleAction(value, appointment);
              },
              itemBuilder: (context) => _buildActionMenuItems(appointment),
            ),
        ],
      ),
      body: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: _buildMainColumn(context, appointment),
                ),
                VerticalDivider(
                  thickness: 1,
                  width: 1,
                  color: isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(40),
                ),
                Expanded(
                  flex: 2,
                  child: _buildSidebar(context, appointment),
                ),
              ],
            )
          : _buildMainColumn(context, appointment),
      bottomNavigationBar: appointment.status.isActive
          ? _buildActionBar(context, appointment)
          : null,
    );
  }

  Widget _buildMainColumn(BuildContext context, Appointment appointment) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    final typeColor = _getTypeColor(appointment.type);
    final statusColor = _getStatusColor(appointment.status);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Type color bar + badges
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withAlpha(isDark ? 35 : 20),
                        borderRadius: AppRadius.borderRadiusSm,
                        border: Border.all(color: statusColor.withAlpha(isDark ? 50 : 30)),
                      ),
                      child: Text(
                        appointment.status.displayName,
                        style: tt.labelSmall?.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: typeColor.withAlpha(isDark ? 20 : 12),
                        borderRadius: AppRadius.borderRadiusSm,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_getTypeIcon(appointment.type), size: 14, color: typeColor),
                          const SizedBox(width: 4),
                          Text(
                            appointment.type.displayName,
                            style: tt.labelSmall?.copyWith(
                              color: typeColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (appointment.isNow)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppTheme.successColor.withAlpha(isDark ? 35 : 20),
                          borderRadius: AppRadius.borderRadiusSm,
                          border: Border.all(color: AppTheme.successColor.withAlpha(isDark ? 50 : 30)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: AppTheme.successColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'En cours',
                              style: tt.labelSmall?.copyWith(
                                color: AppTheme.successColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                // Title
                Text(
                  appointment.title,
                  style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                if (appointment.description != null && appointment.description!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    appointment.description!,
                    style: tt.bodyLarge?.copyWith(
                      color: cs.onSurfaceVariant,
                      height: 1.6,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Sidebar info on narrow screens
        if (!isWide)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildInfoCards(context, appointment),
            ),
          ),

        // Divider
        SliverToBoxAdapter(
          child: Divider(
            height: 1,
            color: isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(40),
          ),
        ),

        // Participants
        if (appointment.participants.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Text(
                'Participants (${appointment.participants.length})',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          SliverList.builder(
            itemCount: appointment.participants.length,
            itemBuilder: (context, index) =>
                _buildParticipantItem(context, appointment.participants[index]),
          ),
        ],

        // Outcome (if completed)
        if (appointment.status == AppointmentStatus.termine && appointment.outcome != null) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Text(
                'Compte-rendu',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withAlpha(isDark ? 15 : 10),
                  borderRadius: AppRadius.borderRadiusMd,
                  border: Border.all(color: AppTheme.successColor.withAlpha(isDark ? 30 : 20)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, size: 16, color: AppTheme.successColor),
                        const SizedBox(width: 8),
                        Text(
                          'Termine',
                          style: tt.labelMedium?.copyWith(
                            color: AppTheme.successColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (appointment.actualDurationMinutes != null) ...[
                          const Spacer(),
                          Text(
                            'Duree reelle : ${appointment.actualDurationMinutes}min',
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      appointment.outcome!,
                      style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],

        // Cancellation reason
        if (appointment.status == AppointmentStatus.annule &&
            appointment.cancellationReason != null) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Text(
                'Motif d\'annulation',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cs.error.withAlpha(isDark ? 15 : 10),
                  borderRadius: AppRadius.borderRadiusMd,
                  border: Border.all(color: cs.error.withAlpha(isDark ? 30 : 20)),
                ),
                child: Text(
                  appointment.cancellationReason!,
                  style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                ),
              ),
            ),
          ),
        ],

        // Notes
        if (appointment.notes != null && appointment.notes!.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Text(
                'Notes',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
                  borderRadius: AppRadius.borderRadiusMd,
                  border: Border.all(
                    color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
                  ),
                ),
                child: Text(
                  appointment.notes!,
                  style: tt.bodyMedium?.copyWith(
                    color: cs.onSurfaceVariant,
                    height: 1.6,
                  ),
                ),
              ),
            ),
          ),
        ],

        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  Widget _buildSidebar(BuildContext context, Appointment appointment) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: _buildInfoCards(context, appointment),
    );
  }

  Widget _buildInfoCards(BuildContext context, Appointment appointment) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final dateFormatted = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(appointment.scheduledAt);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Date & time
        _InfoCard(
          title: 'Date et heure',
          icon: Icons.schedule_rounded,
          isDark: isDark,
          cs: cs,
          children: [
            Text(
              dateFormatted[0].toUpperCase() + dateFormatted.substring(1),
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              appointment.timeRange,
              style: tt.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: cs.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Duree : ${appointment.formattedDuration}',
              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Location
        _InfoCard(
          title: 'Lieu',
          icon: _getLocationTypeIcon(appointment.locationType),
          isDark: isDark,
          cs: cs,
          children: [
            Text(
              appointment.locationType.displayName,
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            if (appointment.location != null && appointment.location!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                appointment.location!,
                style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),

        // Organizer
        _InfoCard(
          title: 'Organisateur',
          icon: Icons.person_outline_rounded,
          isDark: isDark,
          cs: cs,
          children: [
            Text(
              appointment.organizerName ?? 'Moi',
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Linked entities
        if (appointment.clientName != null ||
            appointment.projectName != null ||
            appointment.leadId != null) ...[
          _InfoCard(
            title: 'Liens',
            icon: Icons.link_rounded,
            isDark: isDark,
            cs: cs,
            children: [
              if (appointment.clientName != null)
                _LinkedEntityChip(
                  icon: Icons.person_rounded,
                  label: appointment.clientName!,
                  color: cs.primary,
                  isDark: isDark,
                  onTap: null,
                ),
              if (appointment.projectName != null) ...[
                const SizedBox(height: 6),
                _LinkedEntityChip(
                  icon: Icons.folder_rounded,
                  label: appointment.projectName!,
                  color: AppTheme.secondaryColor,
                  isDark: isDark,
                  onTap: appointment.projectId != null
                      ? () => context.goToProjectDetail(appointment.projectId!)
                      : null,
                ),
              ],
              if (appointment.leadId != null && appointment.clientName == null) ...[
                const SizedBox(height: 6),
                _LinkedEntityChip(
                  icon: Icons.trending_up_rounded,
                  label: 'Lead #${appointment.leadId!.substring(0, 8)}',
                  color: AppTheme.tertiaryColor,
                  isDark: isDark,
                  onTap: null,
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
        ],

        // Details
        _InfoCard(
          title: 'Details',
          icon: Icons.info_outline_rounded,
          isDark: isDark,
          cs: cs,
          children: [
            _DetailRow(label: 'Cree le', value: appointment.createdAt.formattedWithTime, tt: tt, cs: cs),
            if (appointment.confirmedAt != null)
              _DetailRow(label: 'Confirme le', value: appointment.confirmedAt!.formattedWithTime, tt: tt, cs: cs),
            if (appointment.startedAt != null)
              _DetailRow(label: 'Demarre le', value: appointment.startedAt!.formattedWithTime, tt: tt, cs: cs),
            if (appointment.completedAt != null)
              _DetailRow(label: 'Termine le', value: appointment.completedAt!.formattedWithTime, tt: tt, cs: cs),
            if (appointment.cancelledAt != null)
              _DetailRow(label: 'Annule le', value: appointment.cancelledAt!.formattedWithTime, tt: tt, cs: cs),
          ],
        ),
      ],
    );
  }

  Widget _buildParticipantItem(BuildContext context, AppointmentParticipant participant) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color responseColor;
    IconData responseIcon;
    switch (participant.responseStatus) {
      case ParticipantResponseStatus.accepte:
        responseColor = AppTheme.successColor;
        responseIcon = Icons.check_circle_rounded;
      case ParticipantResponseStatus.refuse:
        responseColor = AppTheme.errorColor;
        responseIcon = Icons.cancel_rounded;
      case ParticipantResponseStatus.enAttente:
        responseColor = AppTheme.warningColor;
        responseIcon = Icons.schedule_rounded;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
          borderRadius: AppRadius.borderRadiusMd,
          border: Border.all(
            color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: cs.primary.withAlpha(isDark ? 30 : 20),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  participant.displayInitials,
                  style: tt.labelSmall?.copyWith(
                    color: cs.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    participant.userName ?? 'Participant',
                    style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                  ),
                  if (participant.userEmail != null)
                    Text(
                      participant.userEmail!,
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest.withAlpha(120),
                borderRadius: AppRadius.borderRadiusSm,
              ),
              child: Text(
                participant.role.displayName,
                style: tt.labelSmall?.copyWith(
                  color: cs.onSurfaceVariant,
                  fontSize: 10,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Icon(responseIcon, size: 20, color: responseColor),
          ],
        ),
      ),
    );
  }

  Widget? _buildActionBar(BuildContext context, Appointment appointment) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final actions = <Widget>[];

    switch (appointment.status) {
      case AppointmentStatus.propose:
        actions.addAll([
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _showCancelDialog(context, appointment),
              icon: const Icon(Icons.close_rounded),
              label: const Text('Annuler'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                _bloc.add(AppointmentConfirmRequested(appointment.id));
              },
              icon: const Icon(Icons.check_rounded),
              label: const Text('Confirmer'),
            ),
          ),
        ]);
      case AppointmentStatus.confirme:
        actions.addAll([
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _showCancelDialog(context, appointment),
              icon: const Icon(Icons.close_rounded),
              label: const Text('Annuler'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                _bloc.add(AppointmentStartRequested(appointment.id));
              },
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Demarrer'),
            ),
          ),
        ]);
      case AppointmentStatus.enCours:
        actions.addAll([
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                _bloc.add(AppointmentNoShowRequested(appointment.id));
              },
              icon: const Icon(Icons.person_off_rounded),
              label: const Text('No-show'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _showCompleteDialog(context, appointment),
              icon: const Icon(Icons.check_circle_rounded),
              label: const Text('Terminer'),
            ),
          ),
        ]);
      default:
        return null;
    }

    if (actions.isEmpty) return null;

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
        child: Row(children: actions),
      ),
    );
  }

  List<PopupMenuEntry<String>> _buildActionMenuItems(Appointment appointment) {
    final items = <PopupMenuEntry<String>>[];

    if (appointment.status == AppointmentStatus.propose) {
      items.add(const PopupMenuItem(
        value: 'confirm',
        child: ListTile(
          leading: Icon(Icons.check_rounded),
          title: Text('Confirmer'),
          contentPadding: EdgeInsets.zero,
        ),
      ));
    }

    if (appointment.status == AppointmentStatus.confirme) {
      items.add(const PopupMenuItem(
        value: 'start',
        child: ListTile(
          leading: Icon(Icons.play_arrow_rounded),
          title: Text('Demarrer'),
          contentPadding: EdgeInsets.zero,
        ),
      ));
    }

    if (appointment.status == AppointmentStatus.enCours) {
      items.add(const PopupMenuItem(
        value: 'complete',
        child: ListTile(
          leading: Icon(Icons.check_circle_rounded),
          title: Text('Terminer'),
          contentPadding: EdgeInsets.zero,
        ),
      ));
      items.add(const PopupMenuItem(
        value: 'noshow',
        child: ListTile(
          leading: Icon(Icons.person_off_rounded),
          title: Text('No-show'),
          contentPadding: EdgeInsets.zero,
        ),
      ));
    }

    if (appointment.status.isActive) {
      items.add(const PopupMenuDivider());
      items.add(const PopupMenuItem(
        value: 'cancel',
        child: ListTile(
          leading: Icon(Icons.close_rounded, color: Colors.red),
          title: Text('Annuler', style: TextStyle(color: Colors.red)),
          contentPadding: EdgeInsets.zero,
        ),
      ));
    }

    return items;
  }

  void _handleAction(String action, Appointment appointment) {
    switch (action) {
      case 'confirm':
        _bloc.add(AppointmentConfirmRequested(appointment.id));
      case 'start':
        _bloc.add(AppointmentStartRequested(appointment.id));
      case 'complete':
        _showCompleteDialog(context, appointment);
      case 'noshow':
        _bloc.add(AppointmentNoShowRequested(appointment.id));
      case 'cancel':
        _showCancelDialog(context, appointment);
    }
  }

  void _showCompleteDialog(BuildContext context, Appointment appointment) {
    final outcomeController = TextEditingController();
    int? actualDuration;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Terminer le rendez-vous'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: outcomeController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Compte-rendu',
                hintText: 'Resume du rendez-vous...',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Duree reelle',
                prefixIcon: Icon(Icons.timer_outlined),
              ),
              items: [15, 30, 45, 60, 90, 120, 150, 180, 240].map((d) {
                final hours = d ~/ 60;
                final minutes = d % 60;
                String label;
                if (hours > 0 && minutes > 0) {
                  label = '${hours}h${minutes.toString().padLeft(2, '0')}';
                } else if (hours > 0) {
                  label = '${hours}h';
                } else {
                  label = '${minutes}min';
                }
                return DropdownMenuItem(value: d, child: Text(label));
              }).toList(),
              onChanged: (v) => actualDuration = v,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              _bloc.add(AppointmentCompleteRequested(
                id: appointment.id,
                outcome: outcomeController.text.trim().isNotEmpty
                    ? outcomeController.text.trim()
                    : null,
                actualDurationMinutes: actualDuration,
              ));
            },
            child: const Text('Terminer'),
          ),
        ],
      ),
    );
  }

  void _showCancelDialog(BuildContext context, Appointment appointment) {
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Annuler le rendez-vous ?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Cette action est irreversible.'),
            const SizedBox(height: 16),
            TextFormField(
              controller: reasonController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Motif (optionnel)',
                hintText: 'Raison de l\'annulation...',
                alignLabelWithHint: true,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Retour'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              _bloc.add(AppointmentCancelRequested(
                id: appointment.id,
                reason: reasonController.text.trim().isNotEmpty
                    ? reasonController.text.trim()
                    : null,
              ));
            },
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Annuler le RDV'),
          ),
        ],
      ),
    );
  }

  Color _getTypeColor(AppointmentType type) {
    switch (type) {
      case AppointmentType.visiteTechnique:
        return AppTheme.infoColor;
      case AppointmentType.audit:
        return const Color(0xFF6f42c1);
      case AppointmentType.rdvCommercial:
        return AppTheme.successColor;
      case AppointmentType.installation:
        return AppTheme.tertiaryColor;
      case AppointmentType.sav:
        return AppTheme.errorColor;
      case AppointmentType.reunionInterne:
        return AppTheme.statusArchive;
      case AppointmentType.autre:
        return const Color(0xFFadb5bd);
    }
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.propose:
        return AppTheme.warningColor;
      case AppointmentStatus.confirme:
        return AppTheme.infoColor;
      case AppointmentStatus.enCours:
        return AppTheme.statusEnCours;
      case AppointmentStatus.termine:
        return AppTheme.successColor;
      case AppointmentStatus.annule:
        return AppTheme.statusArchive;
      case AppointmentStatus.noShow:
        return AppTheme.errorColor;
    }
  }

  IconData _getTypeIcon(AppointmentType type) {
    switch (type) {
      case AppointmentType.visiteTechnique:
        return Icons.engineering_rounded;
      case AppointmentType.audit:
        return Icons.checklist_rounded;
      case AppointmentType.rdvCommercial:
        return Icons.handshake_rounded;
      case AppointmentType.installation:
        return Icons.build_rounded;
      case AppointmentType.sav:
        return Icons.support_agent_rounded;
      case AppointmentType.reunionInterne:
        return Icons.groups_rounded;
      case AppointmentType.autre:
        return Icons.event_rounded;
    }
  }

  IconData _getLocationTypeIcon(LocationType type) {
    switch (type) {
      case LocationType.surSite:
        return Icons.location_on_outlined;
      case LocationType.bureau:
        return Icons.business_outlined;
      case LocationType.visio:
        return Icons.videocam_outlined;
      case LocationType.telephone:
        return Icons.phone_outlined;
    }
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isDark;
  final ColorScheme cs;
  final List<Widget> children;

  const _InfoCard({
    required this.title,
    required this.icon,
    required this.isDark,
    required this.cs,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border.all(
          color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: cs.onSurfaceVariant),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: cs.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final TextTheme tt;
  final ColorScheme cs;

  const _DetailRow({
    required this.label,
    required this.value,
    required this.tt,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _LinkedEntityChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;
  final VoidCallback? onTap;

  const _LinkedEntityChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.isDark,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withAlpha(isDark ? 20 : 12),
      borderRadius: AppRadius.borderRadiusSm,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusSm,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (onTap != null) ...[
                const SizedBox(width: 4),
                Icon(Icons.chevron_right_rounded, size: 16, color: color),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
