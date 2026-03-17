import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/ticket.dart';
import '../../blocs/tickets/tickets_bloc.dart';
import '../../blocs/tickets/tickets_event.dart';
import '../../blocs/tickets/tickets_state.dart';

class TicketDetailScreen extends ConsumerStatefulWidget {
  final String ticketId;

  const TicketDetailScreen({super.key, required this.ticketId});

  @override
  ConsumerState<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends ConsumerState<TicketDetailScreen> {
  final _commentController = TextEditingController();
  CommentType _commentType = CommentType.public;
  late final TicketsBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = ref.read(ticketDetailBlocProvider(widget.ticketId));
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bloc = ref.watch(ticketDetailBlocProvider(widget.ticketId));

    return BlocConsumer<TicketsBloc, TicketsState>(
      bloc: bloc,
      listener: (context, state) {
        if (state is TicketOperationSuccess) {
          context.showSuccessSnackBar(state.message);
        } else if (state is TicketsError) {
          context.showErrorSnackBar(state.message);
        }
      },
      builder: (context, state) {
        if (state is TicketsLoading || state is TicketsInitial) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Ticket')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (state is TicketsError) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Ticket')),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline_rounded, size: 48, color: cs.error),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  FilledButton.tonalIcon(
                    onPressed: () => bloc.add(TicketLoadRequested(widget.ticketId)),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Réessayer'),
                  ),
                ],
              ),
            ),
          );
        }

        if (state is! TicketDetailLoaded) {
          return Scaffold(
            backgroundColor: cs.surface,
            appBar: AppBar(title: const Text('Ticket')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        final ticket = state.ticket;
        return _buildContent(context, ticket);
      },
    );
  }

  Widget _buildContent(BuildContext context, Ticket ticket) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: Text(ticket.number),
        actions: [
          // Status change menu
          PopupMenuButton<TicketStatus>(
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'Changer le statut',
            onSelected: (status) {
              HapticFeedback.lightImpact();
              _bloc.add(TicketStatusChangeRequested(
                id: ticket.id,
                status: status,
              ));
            },
            itemBuilder: (context) => TicketStatus.values
                .where((s) => s != ticket.status)
                .map((status) => PopupMenuItem(
                      value: status,
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _getStatusColor(status),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(status.displayName),
                        ],
                      ),
                    ))
                .toList(),
          ),
          // More actions
          PopupMenuButton<String>(
            tooltip: 'Plus d\'actions',
            onSelected: (value) {
              HapticFeedback.lightImpact();
              switch (value) {
                case 'escalate':
                  _bloc.add(TicketEscalateRequested(id: ticket.id));
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'escalate',
                child: ListTile(
                  leading: Icon(Icons.trending_up_rounded),
                  title: Text('Escalader'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Main content
                Expanded(
                  flex: 3,
                  child: _buildMainColumn(context, ticket),
                ),
                VerticalDivider(
                  thickness: 1,
                  width: 1,
                  color: isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(40),
                ),
                // Sidebar
                Expanded(
                  flex: 2,
                  child: _buildSidebar(context, ticket),
                ),
              ],
            )
          : _buildMainColumn(context, ticket),
    );
  }

  Widget _buildMainColumn(BuildContext context, Ticket ticket) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return CustomScrollView(
      slivers: [
        // Ticket info header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status + Priority badges
                Row(
                  children: [
                    _StatusBadge(status: ticket.status, color: _getStatusColor(ticket.status), isDark: isDark),
                    const SizedBox(width: 8),
                    _PriorityBadge(priority: ticket.priority, color: _getPriorityColor(ticket.priority), isDark: isDark),
                    if (ticket.slaBreached) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: cs.error.withAlpha(isDark ? 35 : 20),
                          borderRadius: AppRadius.borderRadiusSm,
                          border: Border.all(color: cs.error.withAlpha(isDark ? 50 : 30)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning_amber_rounded, size: 14, color: cs.error),
                            const SizedBox(width: 4),
                            Text('SLA dépassé', style: tt.labelSmall?.copyWith(color: cs.error, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                    if (ticket.escalationLevel > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppTheme.tertiaryColor.withAlpha(isDark ? 35 : 20),
                          borderRadius: AppRadius.borderRadiusSm,
                        ),
                        child: Text(
                          'Niveau ${ticket.escalationLevel}',
                          style: tt.labelSmall?.copyWith(color: AppTheme.tertiaryColor, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                // Title
                Text(
                  ticket.title,
                  style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                // Description
                Text(
                  ticket.description,
                  style: tt.bodyLarge?.copyWith(
                    color: cs.onSurfaceVariant,
                    height: 1.6,
                  ),
                ),
                // AI diagnosis if present
                if (ticket.aiDiagnosis != null && ticket.aiDiagnosis!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cs.tertiary.withAlpha(isDark ? 15 : 10),
                      borderRadius: AppRadius.borderRadiusMd,
                      border: Border.all(color: cs.tertiary.withAlpha(isDark ? 30 : 20)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.smart_toy_outlined, size: 16, color: cs.tertiary),
                            const SizedBox(width: 8),
                            Text(
                              'Diagnostic IA',
                              style: tt.labelMedium?.copyWith(color: cs.tertiary, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          ticket.aiDiagnosis!,
                          style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Sidebar info (shown below on narrow screens)
        if (!isWide) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildInfoCards(context, ticket),
            ),
          ),
        ],

        // Divider
        SliverToBoxAdapter(
          child: Divider(
            height: 1,
            color: isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(40),
          ),
        ),

        // Comments section
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
            child: Text(
              'Commentaires',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ),

        // Comments list
        if (ticket.comments.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Text(
                'Aucun commentaire pour le moment',
                style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
              ),
            ),
          )
        else
          SliverList.builder(
            itemCount: ticket.comments.length,
            itemBuilder: (context, index) {
              final comment = ticket.comments[index];
              return _buildCommentItem(context, comment);
            },
          ),

        // Add comment
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: _buildCommentInput(context, ticket),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }

  Widget _buildSidebar(BuildContext context, Ticket ticket) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: _buildInfoCards(context, ticket),
    );
  }

  Widget _buildInfoCards(BuildContext context, Ticket ticket) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Client info
        _InfoCard(
          title: 'Client',
          icon: Icons.person_outline_rounded,
          isDark: isDark,
          cs: cs,
          children: [
            Text(ticket.clientName, style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            if (ticket.client?.email != null) ...[
              const SizedBox(height: 4),
              Text(ticket.client!.email!, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            ],
          ],
        ),
        const SizedBox(height: 12),

        // Assignment
        _InfoCard(
          title: 'Assigné à',
          icon: Icons.assignment_ind_outlined,
          isDark: isDark,
          cs: cs,
          children: [
            Text(
              ticket.assignedToName,
              style: tt.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: ticket.assignedTo != null ? null : cs.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Details
        _InfoCard(
          title: 'Détails',
          icon: Icons.info_outline_rounded,
          isDark: isDark,
          cs: cs,
          children: [
            _DetailRow(label: 'Source', value: ticket.source.displayName, tt: tt, cs: cs),
            if (ticket.category != null)
              _DetailRow(label: 'Catégorie', value: ticket.category!.name, tt: tt, cs: cs),
            _DetailRow(label: 'Créé le', value: ticket.createdAt.formattedWithTime, tt: tt, cs: cs),
            if (ticket.firstResponseAt != null)
              _DetailRow(label: '1ère réponse', value: ticket.firstResponseAt!.formattedWithTime, tt: tt, cs: cs),
            if (ticket.resolvedAt != null)
              _DetailRow(label: 'Résolu le', value: ticket.resolvedAt!.formattedWithTime, tt: tt, cs: cs),
          ],
        ),

        // Tags
        if (ticket.tags.isNotEmpty) ...[
          const SizedBox(height: 12),
          _InfoCard(
            title: 'Tags',
            icon: Icons.label_outline_rounded,
            isDark: isDark,
            cs: cs,
            children: [
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: ticket.tags.map((tag) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: cs.primary.withAlpha(isDark ? 20 : 12),
                    borderRadius: AppRadius.borderRadiusSm,
                  ),
                  child: Text(
                    tag,
                    style: tt.labelSmall?.copyWith(color: cs.primary),
                  ),
                )).toList(),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildCommentItem(BuildContext context, TicketComment comment) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isInternal = comment.isInternal;
    final isClient = comment.isFromClient;
    final isAi = comment.isFromAi;

    Color borderColor;
    Color? bgColor;
    if (isInternal) {
      borderColor = AppTheme.warningColor.withAlpha(isDark ? 40 : 25);
      bgColor = AppTheme.warningColor.withAlpha(isDark ? 8 : 5);
    } else if (isAi) {
      borderColor = cs.tertiary.withAlpha(isDark ? 40 : 25);
      bgColor = cs.tertiary.withAlpha(isDark ? 8 : 5);
    } else {
      borderColor = isDark ? Colors.white.withAlpha(8) : cs.outlineVariant.withAlpha(30);
      bgColor = null;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: AppRadius.borderRadiusMd,
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Author icon
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isClient
                        ? cs.primary.withAlpha(isDark ? 30 : 20)
                        : isAi
                            ? cs.tertiary.withAlpha(isDark ? 30 : 20)
                            : cs.surfaceContainerHighest,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isClient
                        ? Icons.person_rounded
                        : isAi
                            ? Icons.smart_toy_rounded
                            : Icons.support_agent_rounded,
                    size: 16,
                    color: isClient
                        ? cs.primary
                        : isAi
                            ? cs.tertiary
                            : cs.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    comment.authorName ?? comment.authorType.name.toUpperCase(),
                    style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                if (isInternal)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.warningColor.withAlpha(isDark ? 30 : 20),
                      borderRadius: AppRadius.borderRadiusSm,
                    ),
                    child: Text(
                      'Interne',
                      style: tt.labelSmall?.copyWith(
                        color: AppTheme.warningColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 10,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                Text(
                  comment.createdAt.smartFormat,
                  style: tt.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant.withAlpha(140),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              comment.content,
              style: tt.bodyMedium?.copyWith(height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommentInput(BuildContext context, Ticket ticket) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Comment type toggle
        Row(
          children: [
            ChoiceChip(
              label: const Text('Public'),
              selected: _commentType == CommentType.public,
              onSelected: (selected) {
                if (selected) setState(() => _commentType = CommentType.public);
              },
            ),
            const SizedBox(width: 8),
            ChoiceChip(
              label: const Text('Interne'),
              selected: _commentType == CommentType.interne,
              onSelected: (selected) {
                if (selected) setState(() => _commentType = CommentType.interne);
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Input field
        Container(
          decoration: BoxDecoration(
            color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest.withAlpha(120),
            borderRadius: AppRadius.borderRadiusMd,
            border: Border.all(
              color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
            ),
          ),
          child: Column(
            children: [
              TextField(
                controller: _commentController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: _commentType == CommentType.interne
                      ? 'Note interne (invisible pour le client)...'
                      : 'Répondre au client...',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    FilledButton.icon(
                      onPressed: () {
                        final content = _commentController.text.trim();
                        if (content.isEmpty) return;
                        HapticFeedback.lightImpact();
                        _bloc.add(TicketCommentAddRequested(
                          ticketId: ticket.id,
                          content: content,
                          type: _commentType,
                        ));
                        _commentController.clear();
                      },
                      icon: const Icon(Icons.send_rounded, size: 18),
                      label: const Text('Envoyer'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
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

class _StatusBadge extends StatelessWidget {
  final TicketStatus status;
  final Color color;
  final bool isDark;

  const _StatusBadge({
    required this.status,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(isDark ? 35 : 20),
        borderRadius: AppRadius.borderRadiusSm,
        border: Border.all(color: color.withAlpha(isDark ? 50 : 30)),
      ),
      child: Text(
        status.displayName,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  final TicketPriority priority;
  final Color color;
  final bool isDark;

  const _PriorityBadge({
    required this.priority,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(isDark ? 20 : 12),
        borderRadius: AppRadius.borderRadiusSm,
      ),
      child: Text(
        priority.displayName,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
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
