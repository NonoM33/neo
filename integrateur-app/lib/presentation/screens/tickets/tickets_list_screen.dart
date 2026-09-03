import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/ticket.dart';
import '../../../routes/app_router.dart';
import '../../blocs/tickets/tickets_bloc.dart';
import '../../blocs/tickets/tickets_event.dart';
import '../../blocs/tickets/tickets_state.dart';
import '../../widgets/ds/ds.dart';

/// Support — liste des tickets.
///
/// iPad paysage : maitre-detail (liste + conversation). Ailleurs : liste,
/// puis detail en plein ecran.
class TicketsListScreen extends ConsumerStatefulWidget {
  const TicketsListScreen({super.key});

  @override
  ConsumerState<TicketsListScreen> createState() => _TicketsListScreenState();
}

class _TicketsListScreenState extends ConsumerState<TicketsListScreen> {
  String _search = '';
  bool _openOnly = true;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(ticketsBlocProvider);
    if (bloc.state is TicketsInitial) {
      bloc.add(const TicketsLoadRequested());
      bloc.add(const TicketStatsLoadRequested());
    }
  }

  List<Ticket> _visible(List<Ticket> tickets) {
    final query = _search.trim().toLowerCase();
    return tickets.where((ticket) {
      if (_openOnly && !ticket.status.isOpen) return false;
      if (query.isEmpty) return true;
      final haystack = [
        ticket.number,
        ticket.title,
        ticket.client?.fullName ?? '',
      ].join(' ').toLowerCase();
      return haystack.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(ticketsBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      appBar: DsAppBar(
        title: 'Support',
        actions: [
          if (!device.isPhone)
            Padding(
              padding: const EdgeInsets.only(right: DsSpacing.s2),
              child: DsButton(
                label: 'Nouveau ticket',
                icon: DsGlyph.add,
                onPressed: () => context.goToTicketCreate(),
              ),
            ),
        ],
      ),
      floatingActionButton: device.isPhone
          ? FloatingActionButton.extended(
              onPressed: () => context.goToTicketCreate(),
              icon: const Icon(DsGlyph.add),
              label: const Text('Nouveau'),
            )
          : null,
      body: BlocBuilder<TicketsBloc, TicketsState>(
        bloc: bloc,
        builder: (context, state) {
          if (state is TicketsLoading || state is TicketsInitial) {
            return const DsSkeletonList();
          }
          if (state is TicketsError) {
            return DsErrorState(
              kind: DsErrorKind.fromMessage(state.message),
              action: DsButton(
                label: 'Recharger',
                icon: DsGlyph.refresh,
                onPressed: () => bloc.add(const TicketsLoadRequested()),
              ),
            );
          }
          if (state is! TicketsLoaded) return const SizedBox.shrink();

          final visible = _visible(state.tickets);
          final padding = DsSpacing.pagePadding(device);

          return Column(
            children: [
              if (state.stats != null)
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    padding,
                    DsSpacing.s3,
                    padding,
                    0,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _Stat(
                          label: 'Ouverts',
                          value: '${state.stats!.totalOpen}',
                        ),
                      ),
                      const SizedBox(width: DsSpacing.s2),
                      Expanded(
                        child: _Stat(
                          label: 'SLA dépassés',
                          value: '${state.stats!.slaBreached}',
                          tone: state.stats!.slaBreached > 0
                              ? ds.error
                              : ds.success,
                        ),
                      ),
                      const SizedBox(width: DsSpacing.s2),
                      Expanded(
                        child: _Stat(
                          label: 'Résolution moy.',
                          value:
                              '${state.stats!.avgResolutionHours.toStringAsFixed(1)} h',
                        ),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: EdgeInsets.fromLTRB(
                  padding,
                  DsSpacing.s3,
                  padding,
                  DsSpacing.s3,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: DsSearchBar(
                        hintText: 'Rechercher un ticket, un client…',
                        onChanged: (value) => setState(() => _search = value),
                      ),
                    ),
                    const SizedBox(width: DsSpacing.s2),
                    DsFilterChip(
                      label: 'Ouverts',
                      selected: _openOnly,
                      onSelected: () => setState(() => _openOnly = !_openOnly),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: visible.isEmpty
                    ? (state.tickets.isEmpty
                        ? DsEmptyState(
                            icon: DsGlyph.support,
                            title: 'Aucun ticket de support',
                            description:
                                'Les demandes clients arrivent ici : panne, réglage, question sur une installation livrée.',
                            action: DsButton(
                              label: 'Créer un ticket',
                              icon: DsGlyph.add,
                              onPressed: () => context.goToTicketCreate(),
                            ),
                          )
                        : const DsEmptyState(
                            icon: DsGlyph.search,
                            title: 'Aucun ticket ne correspond',
                            description:
                                'Élargissez la recherche, ou affichez aussi les tickets résolus.',
                          ))
                    : ListView.separated(
                        padding: EdgeInsets.fromLTRB(
                          padding,
                          0,
                          padding,
                          DsSpacing.s16,
                        ),
                        itemCount: visible.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(height: DsSpacing.gapCard),
                        itemBuilder: (context, index) {
                          final ticket = visible[index];
                          return DsTicketCard(
                            number: ticket.number,
                            subject: ticket.title,
                            status: ticket.status.dsStatus,
                            priority: ticket.priority.dsPriority,
                            clientName: ticket.client?.fullName,
                            slaBreached: ticket.slaBreached,
                            slaLabel: ticket.slaBreached
                                ? 'SLA dépassé'
                                : ticket.firstResponseDueAt == null
                                    ? null
                                    : '1re réponse avant ${DateFormat('HH:mm', 'fr_FR').format(ticket.firstResponseDueAt!)}',
                            source: ticket.source.displayName,
                            lastActivity: DateFormat('d MMM · HH:mm', 'fr_FR')
                                .format(ticket.updatedAt ?? ticket.createdAt),
                            onTap: () => context.goToTicketDetail(ticket.id),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.tone});

  final String label;
  final String value;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Container(
      padding: const EdgeInsets.all(DsSpacing.s3),
      decoration: BoxDecoration(
        gradient: ds.gradientStat,
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: ds.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: t.badgeSize,
              fontWeight: DsWeight.semibold,
              color: ds.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: t.h3Size,
              fontWeight: DsWeight.semibold,
              fontFeatures: dsTabularFigures,
              color: tone ?? ds.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Passerelles metier → Design System.
extension TicketStatusDs on TicketStatus {
  DsStatus get dsStatus => switch (this) {
        TicketStatus.nouveau => DsStatus.nouveau,
        TicketStatus.ouvert => DsStatus.ouvert,
        TicketStatus.enAttenteClient => DsStatus.attenteClient,
        TicketStatus.enAttenteInterne => DsStatus.attenteInterne,
        TicketStatus.escalade => DsStatus.escalade,
        TicketStatus.resolu => DsStatus.resolu,
        TicketStatus.ferme => DsStatus.ferme,
      };
}

extension TicketPriorityDs on TicketPriority {
  DsPriority get dsPriority => switch (this) {
        TicketPriority.basse => DsPriority.basse,
        TicketPriority.normale => DsPriority.normale,
        TicketPriority.haute => DsPriority.haute,
        TicketPriority.urgente => DsPriority.urgente,
        TicketPriority.critique => DsPriority.critique,
      };
}
