import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/ticket.dart';
import '../../../domain/repositories/ticket_repository.dart';
import '../../../routes/app_router.dart';
import '../../blocs/tickets/tickets_bloc.dart';
import '../../blocs/tickets/tickets_event.dart';
import '../../blocs/tickets/tickets_state.dart';

class TicketsListScreen extends ConsumerStatefulWidget {
  const TicketsListScreen({super.key});

  @override
  ConsumerState<TicketsListScreen> createState() => _TicketsListScreenState();
}

class _TicketsListScreenState extends ConsumerState<TicketsListScreen> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  TicketStatus? _selectedStatus;
  TicketPriority? _selectedPriority;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(ticketsBlocProvider);
    if (bloc.state is TicketsInitial) {
      bloc.add(const TicketsLoadRequested());
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value, TicketsBloc bloc) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _applyFilters(bloc);
    });
    setState(() {});
  }

  void _applyFilters(TicketsBloc bloc) {
    final query = _searchController.text;
    if (query.isEmpty && _selectedStatus == null && _selectedPriority == null) {
      bloc.add(const TicketsFilterCleared());
    } else {
      bloc.add(TicketsFilterChanged(
        TicketFilter(
          searchQuery: query.isNotEmpty ? query : null,
          status: _selectedStatus,
          priority: _selectedPriority,
        ),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticketsBloc = ref.watch(ticketsBlocProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: BlocConsumer<TicketsBloc, TicketsState>(
        bloc: ticketsBloc,
        listener: (context, state) {
          if (state is TicketOperationSuccess) {
            context.showSuccessSnackBar(state.message);
          } else if (state is TicketsError) {
            context.showErrorSnackBar(state.message);
          }
        },
        builder: (context, state) {
          return CustomScrollView(
            slivers: [
              // Header with stats
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
                  child: _buildHeader(context, state, ticketsBloc),
                ),
              ),

              // Stats cards
              if (state is TicketsLoaded && state.stats != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
                    child: _buildStatsCards(context, state.stats!),
                  ),
                ),

              // Search bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
                  child: _buildSearchBar(context, ticketsBloc),
                ),
              ),

              // Status filter chips
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: _buildStatusFilters(context, ticketsBloc),
                ),
              ),

              // Priority filter chips
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: _buildPriorityFilters(context, ticketsBloc),
                ),
              ),

              // Content
              if (state is TicketsLoading || state is TicketsInitial)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (state is TicketsError)
                SliverFillRemaining(
                  child: _buildError(context, state, ticketsBloc),
                )
              else if (state is TicketsLoaded)
                ..._buildTicketsContent(context, state),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context, TicketsState state, TicketsBloc bloc) {
    final cs = Theme.of(context).colorScheme;

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Support',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                ),
              ),
              if (state is TicketsLoaded) ...[
                const SizedBox(height: 4),
                Text(
                  '${state.tickets.length} ticket${state.tickets.length > 1 ? 's' : ''}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
        _ActionButton(
          icon: Icons.refresh_rounded,
          onTap: () => bloc.add(const TicketsRefreshRequested()),
          cs: cs,
          tooltip: 'Actualiser',
        ),
        const SizedBox(width: 8),
        _ActionButton(
          icon: Icons.add_rounded,
          onTap: () {
            HapticFeedback.lightImpact();
            context.goToTicketCreate();
          },
          cs: cs,
          isPrimary: true,
          tooltip: 'Nouveau ticket',
        ),
      ],
    );
  }

  Widget _buildStatsCards(BuildContext context, TicketStats stats) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'Ouverts',
            value: '${stats.totalOpen}',
            icon: Icons.inbox_rounded,
            color: AppTheme.statusEnCours,
            isDark: isDark,
            cs: cs,
            tt: tt,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            label: 'SLA dépassés',
            value: '${stats.slaBreached}',
            icon: Icons.warning_amber_rounded,
            color: AppTheme.errorColor,
            isDark: isDark,
            cs: cs,
            tt: tt,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            label: 'Résolution moy.',
            value: stats.avgResolutionHours > 0
                ? '${stats.avgResolutionHours.toStringAsFixed(1)}h'
                : '-',
            icon: Icons.timer_outlined,
            color: AppTheme.secondaryColor,
            isDark: isDark,
            cs: cs,
            tt: tt,
          ),
        ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context, TicketsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest.withAlpha(120),
        borderRadius: AppRadius.borderRadiusLg,
      ),
      child: TextField(
        controller: _searchController,
        focusNode: _searchFocusNode,
        decoration: InputDecoration(
          hintText: 'Rechercher un ticket, un client...',
          hintStyle: TextStyle(color: cs.onSurfaceVariant.withAlpha(140)),
          prefixIcon: Icon(Icons.search_rounded, color: cs.onSurfaceVariant),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.close_rounded, color: cs.onSurfaceVariant),
                  tooltip: 'Effacer la recherche',
                  onPressed: () {
                    _searchController.clear();
                    _debounce?.cancel();
                    _selectedStatus = null;
                    _selectedPriority = null;
                    bloc.add(const TicketsFilterCleared());
                    setState(() {});
                  },
                )
              : null,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        onChanged: (value) => _onSearchChanged(value, bloc),
      ),
    );
  }

  Widget _buildStatusFilters(BuildContext context, TicketsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        children: [
          _FilterChip(
            label: 'Tous',
            isSelected: _selectedStatus == null,
            color: cs.primary,
            isDark: isDark,
            onTap: () {
              setState(() => _selectedStatus = null);
              _applyFilters(bloc);
            },
          ),
          const SizedBox(width: 8),
          ...TicketStatus.values.map((status) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _FilterChip(
                label: status.displayName,
                isSelected: _selectedStatus == status,
                color: _getStatusColor(status),
                isDark: isDark,
                onTap: () {
                  setState(() => _selectedStatus = _selectedStatus == status ? null : status);
                  _applyFilters(bloc);
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildPriorityFilters(BuildContext context, TicketsBloc bloc) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        children: TicketPriority.values.map((priority) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _FilterChip(
              label: priority.displayName,
              isSelected: _selectedPriority == priority,
              color: _getPriorityColor(priority),
              isDark: isDark,
              onTap: () {
                setState(() =>
                    _selectedPriority = _selectedPriority == priority ? null : priority);
                _applyFilters(bloc);
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildError(BuildContext context, TicketsError state, TicketsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cs.errorContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.cloud_off_rounded, size: 40, color: cs.onErrorContainer),
          ),
          const SizedBox(height: 20),
          Text(state.message, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: () => bloc.add(const TicketsLoadRequested()),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Recharger'),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildTicketsContent(BuildContext context, TicketsLoaded state) {
    if (state.tickets.isEmpty) {
      return [
        SliverFillRemaining(child: _buildEmptyState(context)),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
        sliver: SliverList.separated(
          itemCount: state.tickets.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (context, index) =>
              _buildTicketCard(context, state.tickets[index]),
        ),
      ),
    ];
  }

  Widget _buildEmptyState(BuildContext context) {
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
            child: Icon(Icons.support_agent_rounded, size: 36, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          Text(
            'Aucun ticket',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Créez un ticket pour commencer le suivi',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: cs.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => context.goToTicketCreate(),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Nouveau ticket'),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketCard(BuildContext context, Ticket ticket) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = _getStatusColor(ticket.status);
    final priorityColor = _getPriorityColor(ticket.priority);

    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.goToTicketDetail(ticket.id),
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
              // Priority indicator
              Container(
                width: 4,
                height: 56,
                decoration: BoxDecoration(
                  color: priorityColor,
                  borderRadius: AppRadius.borderRadiusFull,
                ),
              ),
              const SizedBox(width: 14),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          ticket.number,
                          style: tt.labelSmall?.copyWith(
                            color: cs.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (ticket.slaBreached) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.warning_amber_rounded, size: 14, color: cs.error),
                          const SizedBox(width: 2),
                          Text(
                            'SLA',
                            style: tt.labelSmall?.copyWith(
                              color: cs.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        if (ticket.source == TicketSource.chatAi) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.smart_toy_outlined, size: 14, color: cs.tertiary),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      ticket.title,
                      style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.person_outline_rounded, size: 14, color: cs.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Text(
                          ticket.clientName,
                          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                        ),
                        if (ticket.assignedTo != null) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.assignment_ind_outlined, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              ticket.assignedToName,
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
              // Status + meta
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
                      ticket.status.displayName,
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
                      color: priorityColor.withAlpha(isDark ? 20 : 12),
                      borderRadius: AppRadius.borderRadiusSm,
                    ),
                    child: Text(
                      ticket.priority.displayName,
                      style: tt.labelSmall?.copyWith(
                        color: priorityColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 10,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ticket.createdAt.relativeTime,
                    style: tt.bodySmall?.copyWith(
                      color: cs.onSurfaceVariant.withAlpha(140),
                      fontSize: 11,
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

  Color _getStatusColor(TicketStatus status) {
    switch (status) {
      case TicketStatus.nouveau:
        return AppTheme.infoColor;
      case TicketStatus.ouvert:
        return AppTheme.statusEnCours;
      case TicketStatus.enAttenteClient:
        return AppTheme.warningColor;
      case TicketStatus.enAttenteInterne:
        return AppTheme.tertiaryColor;
      case TicketStatus.escalade:
        return AppTheme.errorColor;
      case TicketStatus.resolu:
        return AppTheme.successColor;
      case TicketStatus.ferme:
        return AppTheme.statusArchive;
    }
  }

  Color _getPriorityColor(TicketPriority priority) {
    switch (priority) {
      case TicketPriority.basse:
        return AppTheme.statusArchive;
      case TicketPriority.normale:
        return AppTheme.infoColor;
      case TicketPriority.haute:
        return AppTheme.warningColor;
      case TicketPriority.urgente:
        return AppTheme.tertiaryColor;
      case TicketPriority.critique:
        return AppTheme.errorColor;
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

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool isDark;
  final ColorScheme cs;
  final TextTheme tt;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.isDark,
    required this.cs,
    required this.tt,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border.all(
          color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withAlpha(isDark ? 30 : 20),
              borderRadius: AppRadius.borderRadiusMd,
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: tt.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                Text(
                  label,
                  style: tt.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
