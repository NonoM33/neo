import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/appointment.dart';
import '../../../routes/app_router.dart';
import '../../blocs/appointments/appointments_bloc.dart';
import '../../blocs/appointments/appointments_event.dart';
import '../../blocs/appointments/appointments_state.dart';
import '../../widgets/ds/ds.dart';

/// Agenda.
///
/// Trois vues — **jour**, **semaine**, mois. Le jour est la vue par defaut sur
/// iPhone (c'est le cas d'usage mobile n°1) ; sur iPad paysage, le calendrier
/// vit a gauche et la journee se deroule a droite.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

enum _View {
  day('Jour'),
  week('Semaine'),
  month('Mois');

  const _View(this.label);
  final String label;
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _selected = DateTime.now();
  DateTime _focused = DateTime.now();
  late _View _view = _View.day;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(appointmentsBlocProvider);
    if (bloc.state is AppointmentsInitial) {
      bloc.add(const AppointmentsLoadRequested());
    }
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  List<Appointment> _forDay(List<Appointment> all, DateTime day) {
    final result =
        all.where((a) => _sameDay(a.scheduledAt, day)).toList()
          ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(appointmentsBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      appBar: DsAppBar(
        title: 'Agenda',
        subtitle: DateFormat('EEEE d MMMM yyyy', 'fr_FR')
            .format(_selected)
            .replaceFirstMapped(RegExp('^.'), (m) => m[0]!.toUpperCase()),
        actions: [
          DsIconButton(
            icon: DsGlyph.today,
            label: 'Aujourd’hui',
            onPressed: () => setState(() {
              _selected = DateTime.now();
              _focused = DateTime.now();
            }),
          ),
          if (!device.isPhone)
            Padding(
              padding: const EdgeInsets.only(right: DsSpacing.s2),
              child: DsButton(
                label: 'Nouveau RDV',
                icon: DsGlyph.add,
                onPressed: () => context.goToAppointmentCreate(),
              ),
            ),
        ],
      ),
      floatingActionButton: device.isPhone
          ? FloatingActionButton.extended(
              onPressed: () => context.goToAppointmentCreate(),
              icon: const Icon(DsGlyph.add),
              label: const Text('Nouveau RDV'),
            )
          : null,
      body: BlocBuilder<AppointmentsBloc, AppointmentsState>(
        bloc: bloc,
        builder: (context, state) {
          if (state is AppointmentsLoading || state is AppointmentsInitial) {
            return const DsSkeletonList(count: 4);
          }
          if (state is AppointmentsError) {
            return DsErrorState(
              kind: DsErrorKind.fromMessage(state.message),
              action: DsButton(
                label: 'Recharger',
                icon: DsGlyph.refresh,
                onPressed: () => bloc.add(const AppointmentsLoadRequested()),
              ),
            );
          }
          if (state is! AppointmentsLoaded) return const SizedBox.shrink();

          final all = state.appointments;
          final padding = DsSpacing.pagePadding(device);
          final wide = device.isDesktop && context.dsIsLandscape;

          final agenda = _Agenda(
            view: _view,
            selected: _selected,
            appointments: all,
            forDay: _forDay,
            onView: (value) => setState(() => _view = value),
            onSelect: (day) => setState(() {
              _selected = day;
              _focused = day;
            }),
          );

          final calendar = _Calendar(
            focused: _focused,
            selected: _selected,
            appointments: all,
            sameDay: _sameDay,
            onSelect: (day, focused) => setState(() {
              _selected = day;
              _focused = focused;
            }),
          );

          if (wide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: (MediaQuery.sizeOf(context).width * 0.34)
                      .clamp(320.0, 460.0),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.all(padding),
                    child: calendar,
                  ),
                ),
                VerticalDivider(width: 1, color: ds.borderSubtle),
                Expanded(child: agenda),
              ],
            );
          }

          return Column(
            children: [
              if (_view == _View.month)
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    padding,
                    DsSpacing.s3,
                    padding,
                    0,
                  ),
                  child: calendar,
                ),
              Expanded(child: agenda),
            ],
          );
        },
      ),
    );
  }
}

class _Calendar extends StatelessWidget {
  const _Calendar({
    required this.focused,
    required this.selected,
    required this.appointments,
    required this.sameDay,
    required this.onSelect,
  });

  final DateTime focused;
  final DateTime selected;
  final List<Appointment> appointments;
  final bool Function(DateTime, DateTime) sameDay;
  final void Function(DateTime day, DateTime focused) onSelect;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return DsCard(
      child: TableCalendar<Appointment>(
        locale: 'fr_FR',
        firstDay: DateTime.utc(2020),
        lastDay: DateTime.utc(2030, 12, 31),
        focusedDay: focused,
        selectedDayPredicate: (day) => sameDay(day, selected),
        onDaySelected: onSelect,
        eventLoader: (day) =>
            appointments.where((a) => sameDay(a.scheduledAt, day)).toList(),
        startingDayOfWeek: StartingDayOfWeek.monday,
        availableGestures: AvailableGestures.horizontalSwipe,
        headerStyle: HeaderStyle(
          formatButtonVisible: false,
          titleCentered: true,
          titleTextStyle: TextStyle(
            fontSize: t.titleSize,
            fontWeight: DsWeight.semibold,
            color: ds.textPrimary,
          ),
          leftChevronIcon: Icon(
            Icons.chevron_left_rounded,
            color: ds.textSecondary,
          ),
          rightChevronIcon: Icon(
            Icons.chevron_right_rounded,
            color: ds.textSecondary,
          ),
        ),
        calendarStyle: CalendarStyle(
          todayDecoration: BoxDecoration(
            color: ds.brandPrimarySoft,
            shape: BoxShape.circle,
          ),
          todayTextStyle: TextStyle(
            color: ds.brandPrimary,
            fontWeight: DsWeight.semibold,
          ),
          selectedDecoration: BoxDecoration(
            color: ds.brandPrimary,
            shape: BoxShape.circle,
          ),
          markerDecoration: BoxDecoration(
            color: ds.brandTertiary,
            shape: BoxShape.circle,
          ),
          defaultTextStyle: TextStyle(
            fontSize: t.captionSize,
            color: ds.textBody,
          ),
          weekendTextStyle: TextStyle(
            fontSize: t.captionSize,
            color: ds.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _Agenda extends StatelessWidget {
  const _Agenda({
    required this.view,
    required this.selected,
    required this.appointments,
    required this.forDay,
    required this.onView,
    required this.onSelect,
  });

  final _View view;
  final DateTime selected;
  final List<Appointment> appointments;
  final List<Appointment> Function(List<Appointment>, DateTime) forDay;
  final ValueChanged<_View> onView;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final padding = DsSpacing.pagePadding(context.dsDevice);
    final days = switch (view) {
      _View.day || _View.month => [selected],
      _View.week => List.generate(
          7,
          (index) => selected
              .subtract(Duration(days: selected.weekday - 1))
              .add(Duration(days: index)),
        ),
    };

    final total =
        days.fold<int>(0, (sum, day) => sum + forDay(appointments, day).length);

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, DsSpacing.s3, padding, 0),
          child: DsSegmentedTabs(
            activeId: view.name,
            onChanged: (id) =>
                onView(_View.values.firstWhere((v) => v.name == id)),
            items: [
              for (final value in _View.values)
                DsTabItem(id: value.name, label: value.label),
            ],
          ),
        ),
        Expanded(
          child: total == 0
              ? DsEmptyState(
                  icon: DsGlyph.eventOutline,
                  title: view == _View.week
                      ? 'Aucun rendez-vous cette semaine'
                      : 'Aucun rendez-vous ce jour',
                  description:
                      'Planifiez une visite technique, un audit ou une installation.',
                  action: DsButton(
                    label: 'Nouveau rendez-vous',
                    icon: DsGlyph.add,
                    onPressed: () => context.goToAppointmentCreate(),
                  ),
                )
              : ListView(
                  padding: EdgeInsets.fromLTRB(
                    padding,
                    DsSpacing.s3,
                    padding,
                    DsSpacing.s16,
                  ),
                  children: [
                    for (final day in days) ...[
                      if (view == _View.week) ...[
                        DsSectionTitle(
                          DateFormat('EEEE d MMMM', 'fr_FR').format(day),
                        ),
                        const SizedBox(height: DsSpacing.s2),
                      ],
                      for (final appointment in forDay(appointments, day)) ...[
                        DsAppointmentCard(
                          type: appointment.type.dsType,
                          time: DateFormat('HH:mm', 'fr_FR')
                              .format(appointment.scheduledAt),
                          duration: '${appointment.durationMinutes} min',
                          clientName: appointment.clientName ??
                              appointment.title,
                          place: appointment.location,
                          status: appointment.status.dsStatus,
                          current: appointment.status ==
                              AppointmentStatus.enCours,
                          onTap: () =>
                              context.goToAppointmentDetail(appointment.id),
                        ),
                        const SizedBox(height: DsSpacing.s2),
                      ],
                      if (view == _View.week &&
                          forDay(appointments, day).isEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.only(
                            bottom: DsSpacing.s3,
                            left: DsSpacing.s2,
                          ),
                          child: Text(
                            'Journée libre',
                            style: TextStyle(
                              fontSize: context.dsType.captionSize,
                              color: context.ds.textTertiary,
                            ),
                          ),
                        ),
                      ],
                      if (view == _View.week)
                        const SizedBox(height: DsSpacing.s3),
                    ],
                  ],
                ),
        ),
      ],
    );
  }
}

/// Passerelles metier → Design System.
extension AppointmentTypeDs on AppointmentType {
  DsAppointmentType get dsType => switch (this) {
        AppointmentType.visiteTechnique => DsAppointmentType.visiteTechnique,
        AppointmentType.audit => DsAppointmentType.audit,
        AppointmentType.rdvCommercial => DsAppointmentType.commercial,
        AppointmentType.installation => DsAppointmentType.installation,
        AppointmentType.sav => DsAppointmentType.sav,
        AppointmentType.reunionInterne => DsAppointmentType.reunion,
        AppointmentType.autre => DsAppointmentType.autre,
      };
}

extension AppointmentStatusDs on AppointmentStatus {
  DsStatus get dsStatus => switch (this) {
        AppointmentStatus.propose => DsStatus.propose,
        AppointmentStatus.confirme => DsStatus.confirme,
        AppointmentStatus.enCours => DsStatus.enCours,
        AppointmentStatus.termine => DsStatus.termine,
        AppointmentStatus.annule => DsStatus.annule,
        AppointmentStatus.noShow => DsStatus.noShow,
      };
}
