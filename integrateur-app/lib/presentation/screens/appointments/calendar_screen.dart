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
import '../../../domain/repositories/appointment_repository.dart';
import '../../../routes/app_router.dart';
import '../../blocs/appointments/appointments_bloc.dart';
import '../../blocs/appointments/appointments_event.dart';
import '../../blocs/appointments/appointments_state.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _focusedMonth = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  AppointmentType? _selectedType;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(appointmentsBlocProvider);
    if (bloc.state is AppointmentsInitial) {
      bloc.add(const AppointmentsLoadRequested());
    }
  }

  void _onMonthChanged(int delta) {
    setState(() {
      _focusedMonth = DateTime(
        _focusedMonth.year,
        _focusedMonth.month + delta,
        1,
      );
    });

    // Update date range in bloc
    final fromDate = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final toDate = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0, 23, 59, 59);

    ref.read(appointmentsBlocProvider).add(AppointmentDateRangeChanged(
      fromDate: fromDate,
      toDate: toDate,
    ));
  }

  void _goToToday() {
    final now = DateTime.now();
    setState(() {
      _focusedMonth = DateTime(now.year, now.month, 1);
      _selectedDay = now;
    });

    final fromDate = DateTime(now.year, now.month, 1);
    final toDate = DateTime(now.year, now.month + 1, 0, 23, 59, 59);

    ref.read(appointmentsBlocProvider).add(AppointmentDateRangeChanged(
      fromDate: fromDate,
      toDate: toDate,
    ));
  }

  void _applyTypeFilter(AppointmentsBloc bloc) {
    if (_selectedType == null) {
      bloc.add(const AppointmentsFilterCleared());
    } else {
      bloc.add(AppointmentsFilterChanged(
        AppointmentFilter(type: _selectedType),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(appointmentsBlocProvider);
    final cs = Theme.of(context).colorScheme;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      backgroundColor: cs.surface,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          HapticFeedback.lightImpact();
          context.goToAppointmentCreate();
        },
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouveau RDV'),
      ),
      body: BlocConsumer<AppointmentsBloc, AppointmentsState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is AppointmentOperationSuccess) {
            context.showSuccessSnackBar(state.message);
          } else if (state is AppointmentsError) {
            context.showErrorSnackBar(state.message);
          }
        },
        builder: (context, state) {
          if (isWide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Calendar sidebar
                SizedBox(
                  width: 380,
                  child: _buildCalendarPanel(context, state, bloc),
                ),
                VerticalDivider(
                  width: 1,
                  thickness: 1,
                  color: cs.outlineVariant.withAlpha(40),
                ),
                // Appointments list
                Expanded(
                  child: _buildAppointmentsList(context, state, bloc),
                ),
              ],
            );
          }

          return CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
                  child: _buildHeader(context, state, bloc),
                ),
              ),
              // Calendar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(32, 16, 32, 0),
                  child: _buildCompactCalendar(context, state),
                ),
              ),
              // Type filters
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: _buildTypeFilters(context, bloc),
                ),
              ),
              // Appointments for selected day
              ..._buildDayAppointments(context, state),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context, AppointmentsState state, AppointmentsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    int count = 0;
    if (state is AppointmentsLoaded) {
      count = state.appointments.length;
    }

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Agenda',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                ),
              ),
              if (state is AppointmentsLoaded) ...[
                const SizedBox(height: 4),
                Text(
                  '$count rendez-vous ce mois',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
        _ActionButton(
          icon: Icons.today_rounded,
          onTap: _goToToday,
          cs: cs,
          tooltip: 'Aujourd\'hui',
        ),
        const SizedBox(width: 8),
        _ActionButton(
          icon: Icons.refresh_rounded,
          onTap: () => bloc.add(const AppointmentsRefreshRequested()),
          cs: cs,
          tooltip: 'Actualiser',
        ),
        const SizedBox(width: 8),
        _ActionButton(
          icon: Icons.add_rounded,
          onTap: () {
            HapticFeedback.lightImpact();
            context.goToAppointmentCreate();
          },
          cs: cs,
          isPrimary: true,
          tooltip: 'Nouveau rendez-vous',
        ),
      ],
    );
  }

  Widget _buildCalendarPanel(BuildContext context, AppointmentsState state, AppointmentsBloc bloc) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
            child: _buildHeader(context, state, bloc),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: _buildCompactCalendar(context, state),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: _buildTypeFilters(context, bloc),
          ),
        ),
        // Today's summary
        if (state is AppointmentsLoaded)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
              child: _buildDaySummary(context, state),
            ),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  Widget _buildAppointmentsList(BuildContext context, AppointmentsState state, AppointmentsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    if (state is AppointmentsLoading || state is AppointmentsInitial) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is AppointmentsError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off_rounded, size: 48, color: cs.error),
            const SizedBox(height: 16),
            Text(state.message),
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: () => bloc.add(const AppointmentsLoadRequested()),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Recharger'),
            ),
          ],
        ),
      );
    }

    if (state is! AppointmentsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    final dayAppointments = state.getForDay(_selectedDay);
    final dayFormatted = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(_selectedDay);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dayFormatted,
                        style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${dayAppointments.length} rendez-vous',
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (dayAppointments.isEmpty)
          SliverFillRemaining(
            child: _buildEmptyDayState(context),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
            sliver: SliverList.separated(
              itemCount: dayAppointments.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) =>
                  _buildAppointmentCard(context, dayAppointments[index]),
            ),
          ),
      ],
    );
  }

  Widget _buildCompactCalendar(BuildContext context, AppointmentsState state) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final monthName = DateFormat('MMMM yyyy', 'fr_FR').format(_focusedMonth);

    // Build calendar grid
    final firstDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final lastDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0);
    // Monday = 1
    final startWeekday = firstDayOfMonth.weekday;
    final daysInMonth = lastDayOfMonth.day;

    // Days from previous month to fill the first row
    final prevMonthDays = startWeekday - 1;

    // Event days for markers
    Set<DateTime> eventDays = {};
    if (state is AppointmentsLoaded) {
      eventDays = state.eventDays;
    }

    final today = DateTime.now();
    final dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border.all(
          color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
        ),
      ),
      child: Column(
        children: [
          // Month navigation
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left_rounded),
                onPressed: () => _onMonthChanged(-1),
                tooltip: 'Mois precedent',
              ),
              Text(
                monthName[0].toUpperCase() + monthName.substring(1),
                style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right_rounded),
                onPressed: () => _onMonthChanged(1),
                tooltip: 'Mois suivant',
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Day labels
          Row(
            children: dayLabels.map((label) {
              return Expanded(
                child: Center(
                  child: Text(
                    label,
                    style: tt.labelSmall?.copyWith(
                      color: cs.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 4),

          // Calendar grid
          ...List.generate(6, (week) {
            return Row(
              children: List.generate(7, (weekday) {
                final dayIndex = week * 7 + weekday - prevMonthDays + 1;
                if (dayIndex < 1 || dayIndex > daysInMonth) {
                  return const Expanded(child: SizedBox(height: 40));
                }

                final date = DateTime(_focusedMonth.year, _focusedMonth.month, dayIndex);
                final isToday = date.year == today.year &&
                    date.month == today.month &&
                    date.day == today.day;
                final isSelected = date.year == _selectedDay.year &&
                    date.month == _selectedDay.month &&
                    date.day == _selectedDay.day;
                final hasEvents = eventDays.contains(
                  DateTime(date.year, date.month, date.day),
                );

                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedDay = date);
                    },
                    child: Container(
                      height: 40,
                      margin: const EdgeInsets.all(1),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? cs.primary
                            : isToday
                                ? cs.primary.withAlpha(isDark ? 30 : 20)
                                : null,
                        borderRadius: AppRadius.borderRadiusSm,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$dayIndex',
                            style: tt.bodySmall?.copyWith(
                              color: isSelected
                                  ? cs.onPrimary
                                  : isToday
                                      ? cs.primary
                                      : null,
                              fontWeight: isToday || isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                              fontSize: 13,
                            ),
                          ),
                          if (hasEvents && !isSelected)
                            Container(
                              width: 4,
                              height: 4,
                              margin: const EdgeInsets.only(top: 2),
                              decoration: BoxDecoration(
                                color: isToday ? cs.primary : cs.onSurfaceVariant,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTypeFilters(BuildContext context, AppointmentsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          _FilterChip(
            label: 'Tous',
            isSelected: _selectedType == null,
            color: cs.primary,
            isDark: isDark,
            onTap: () {
              setState(() => _selectedType = null);
              _applyTypeFilter(bloc);
            },
          ),
          const SizedBox(width: 8),
          ...AppointmentType.values.map((type) {
            final color = _getTypeColor(type);
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _FilterChip(
                label: type.displayName,
                isSelected: _selectedType == type,
                color: color,
                isDark: isDark,
                onTap: () {
                  setState(() => _selectedType = _selectedType == type ? null : type);
                  _applyTypeFilter(bloc);
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildDaySummary(BuildContext context, AppointmentsLoaded state) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final dayAppointments = state.getForDay(_selectedDay);
    final dayFormatted = DateFormat('EEEE d MMMM', 'fr_FR').format(_selectedDay);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          dayFormatted[0].toUpperCase() + dayFormatted.substring(1),
          style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(
          '${dayAppointments.length} rendez-vous',
          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
        ),
        const SizedBox(height: 12),
        ...dayAppointments.map((apt) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _buildMiniAppointmentCard(context, apt),
        )),
        if (dayAppointments.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest.withAlpha(120),
              borderRadius: AppRadius.borderRadiusMd,
            ),
            child: Column(
              children: [
                Icon(Icons.event_available_rounded, size: 32, color: cs.onSurfaceVariant.withAlpha(120)),
                const SizedBox(height: 8),
                Text(
                  'Aucun rendez-vous',
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildMiniAppointmentCard(BuildContext context, Appointment appointment) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final typeColor = _getTypeColor(appointment.type);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.goToAppointmentDetail(appointment.id),
        borderRadius: AppRadius.borderRadiusSm,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusSm,
            border: Border(
              left: BorderSide(color: typeColor, width: 3),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment.timeRange,
                      style: tt.labelSmall?.copyWith(
                        color: cs.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      appointment.title,
                      style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, size: 16, color: cs.onSurfaceVariant.withAlpha(100)),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildDayAppointments(BuildContext context, AppointmentsState state) {
    if (state is AppointmentsLoading || state is AppointmentsInitial) {
      return [
        const SliverFillRemaining(
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }

    if (state is AppointmentsError) {
      return [
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.cloud_off_rounded, size: 48, color: Theme.of(context).colorScheme.error),
                const SizedBox(height: 16),
                Text(state.message),
                const SizedBox(height: 16),
                FilledButton.tonalIcon(
                  onPressed: () =>
                      ref.read(appointmentsBlocProvider).add(const AppointmentsLoadRequested()),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Recharger'),
                ),
              ],
            ),
          ),
        ),
      ];
    }

    if (state is! AppointmentsLoaded) {
      return [const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))];
    }

    final dayAppointments = state.getForDay(_selectedDay);
    final dayFormatted = DateFormat('EEEE d MMMM', 'fr_FR').format(_selectedDay);

    if (dayAppointments.isEmpty) {
      return [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(32, 16, 32, 0),
            child: Text(
              dayFormatted[0].toUpperCase() + dayFormatted.substring(1),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ),
        SliverFillRemaining(
          child: _buildEmptyDayState(context),
        ),
      ];
    }

    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(32, 16, 32, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  dayFormatted[0].toUpperCase() + dayFormatted.substring(1),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              Text(
                '${dayAppointments.length} RDV',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(32, 0, 32, 0),
        sliver: SliverList.separated(
          itemCount: dayAppointments.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) =>
              _buildAppointmentCard(context, dayAppointments[index]),
        ),
      ),
    ];
  }

  Widget _buildEmptyDayState(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest,
              borderRadius: AppRadius.borderRadiusXl,
            ),
            child: Icon(Icons.event_available_rounded, size: 36, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          Text(
            'Aucun rendez-vous',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Planifiez un rendez-vous pour cette journee',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: cs.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => context.goToAppointmentCreate(),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Nouveau rendez-vous'),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(BuildContext context, Appointment appointment) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final typeColor = _getTypeColor(appointment.type);
    final statusColor = _getStatusColor(appointment.status);

    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.goToAppointmentDetail(appointment.id),
        borderRadius: AppRadius.borderRadiusLg,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusLg,
            border: Border.all(
              color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
            ),
          ),
          child: Row(
            children: [
              // Type color bar
              Container(
                width: 4,
                height: 64,
                decoration: BoxDecoration(
                  color: typeColor,
                  borderRadius: AppRadius.borderRadiusFull,
                ),
              ),
              const SizedBox(width: 14),
              // Time column
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    appointment.scheduledAt.hour.toString().padLeft(2, '0') +
                        ':' +
                        appointment.scheduledAt.minute.toString().padLeft(2, '0'),
                    style: tt.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    appointment.formattedDuration,
                    style: tt.labelSmall?.copyWith(
                      color: cs.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              // Main info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _getTypeIcon(appointment.type),
                          size: 14,
                          color: typeColor,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            appointment.title,
                            style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (appointment.clientName != null) ...[
                          Icon(Icons.person_outline_rounded, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              appointment.clientName!,
                              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (appointment.location != null) ...[
                          Icon(_getLocationTypeIcon(appointment.locationType), size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              appointment.location!,
                              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Status badge
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: statusColor.withAlpha(isDark ? 35 : 20),
                      borderRadius: AppRadius.borderRadiusSm,
                      border: Border.all(
                        color: statusColor.withAlpha(isDark ? 50 : 30),
                      ),
                    ),
                    child: Text(
                      appointment.status.displayName,
                      style: tt.labelSmall?.copyWith(
                        color: statusColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: typeColor.withAlpha(isDark ? 20 : 12),
                      borderRadius: AppRadius.borderRadiusSm,
                    ),
                    child: Text(
                      appointment.type.displayName,
                      style: tt.labelSmall?.copyWith(
                        color: typeColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right_rounded, color: cs.onSurfaceVariant.withAlpha(100), size: 24),
            ],
          ),
        ),
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

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final ColorScheme cs;
  final bool isPrimary;
  final String tooltip;

  const _ActionButton({
    required this.icon,
    required this.onTap,
    required this.cs,
    this.isPrimary = false,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton.filled(
      onPressed: onTap,
      icon: Icon(icon, size: 20),
      tooltip: tooltip,
      style: IconButton.styleFrom(
        backgroundColor: isPrimary ? cs.primary : cs.surfaceContainerHighest,
        foregroundColor: isPrimary ? cs.onPrimary : cs.onSurface,
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: isSelected ? color.withAlpha(isDark ? 50 : 25) : Colors.transparent,
      borderRadius: AppRadius.borderRadiusSm,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusSm,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusSm,
            border: Border.all(
              color: isSelected
                  ? color.withAlpha(isDark ? 100 : 60)
                  : (isDark ? Colors.white.withAlpha(20) : cs.outlineVariant.withAlpha(40)),
            ),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: isSelected ? color : cs.onSurfaceVariant,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
