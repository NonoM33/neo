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
import 'tickets_list_screen.dart' show TicketPriorityDs, TicketStatusDs;

/// Detail d'un ticket de support.
///
/// Regle non negociable : **public et interne ne doivent jamais pouvoir etre
/// confondus**. Le compositeur change de couleur, de libelle et d'icone, et
/// une note interne porte toujours la mention « invisible pour le client ».
class TicketDetailScreen extends ConsumerStatefulWidget {
  const TicketDetailScreen({required this.ticketId, super.key});

  final String ticketId;

  @override
  ConsumerState<TicketDetailScreen> createState() =>
      _TicketDetailScreenState();
}

class _TicketDetailScreenState extends ConsumerState<TicketDetailScreen> {
  final TextEditingController _composer = TextEditingController();
  CommentType _commentType = CommentType.public;

  @override
  void initState() {
    super.initState();
    ref.read(ticketsBlocProvider).add(TicketLoadRequested(widget.ticketId));
  }

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(ticketsBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<TicketsBloc, TicketsState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is TicketOperationSuccess) {
            _composer.clear();
            showDsSnackbar(
              context,
              message: state.message,
              tone: DsTone.success,
            );
          }
          if (state is TicketsError) {
            showDsSnackbar(context, message: state.message, tone: DsTone.error);
          }
        },
        builder: (context, state) {
          if (state is TicketsLoading || state is TicketsInitial) {
            return const SafeArea(child: DsSkeletonConversation());
          }
          if (state is TicketsError) {
            return SafeArea(
              child: DsErrorState(
                kind: DsErrorKind.fromMessage(state.message),
                action: DsButton(
                  label: 'Réessayer',
                  icon: DsGlyph.refresh,
                  onPressed: () =>
                      bloc.add(TicketLoadRequested(widget.ticketId)),
                ),
              ),
            );
          }
          if (state is! TicketDetailLoaded) return const SizedBox.shrink();

          final ticket = state.ticket;
          final wide = device.isDesktop && context.dsIsLandscape;

          final conversation = _Conversation(
            ticket: ticket,
            composer: _composer,
            commentType: _commentType,
            onCommentType: (value) => setState(() => _commentType = value),
            onSend: () {
              final content = _composer.text.trim();
              if (content.isEmpty) return;
              bloc.add(
                TicketCommentAddRequested(
                  ticketId: ticket.id,
                  content: content,
                  type: _commentType,
                ),
              );
            },
          );

          return Column(
            children: [
              DsAppBar(
                title: ticket.number,
                subtitle: ticket.title,
                backLabel: 'Retour au support',
                onBack: () => context.goToTickets(),
                actions: [
                  DsIconButton(
                    icon: DsGlyph.trendingUp,
                    label: 'Escalader',
                    onPressed: () => _escalate(context, bloc, ticket),
                  ),
                  DsIconButton(
                    icon: DsGlyph.taskAlt,
                    label: 'Changer le statut',
                    onPressed: () => _changeStatus(context, bloc, ticket),
                  ),
                ],
              ),
              Expanded(
                child: wide
                    ? Row(
                        children: [
                          Expanded(child: conversation),
                          DsSidePanel(
                            title: 'Détails',
                            widthFactor: 0.3,
                            child: _Details(ticket: ticket),
                          ),
                        ],
                      )
                    : ListView(
                        padding: EdgeInsets.zero,
                        children: [
                          _Details(ticket: ticket, shrinkWrap: true),
                          SizedBox(
                            height: MediaQuery.sizeOf(context).height * 0.6,
                            child: conversation,
                          ),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _changeStatus(
    BuildContext context,
    TicketsBloc bloc,
    Ticket ticket,
  ) async {
    await showDsSheet<void>(
      context,
      title: 'Changer le statut',
      subtitle: ticket.number,
      builder: (sheetContext) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final status in TicketStatus.values)
            Padding(
              padding: const EdgeInsets.only(bottom: DsSpacing.s2),
              child: DsCard(
                selected: status == ticket.status,
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  bloc.add(
                    TicketStatusChangeRequested(
                      id: ticket.id,
                      status: status,
                    ),
                  );
                },
                padding: const EdgeInsets.symmetric(
                  horizontal: DsSpacing.s4,
                  vertical: DsSpacing.s3,
                ),
                child: Row(
                  children: [
                    DsStatusBadge(status: status.dsStatus),
                    const Spacer(),
                    if (status == ticket.status)
                      DsIcon(
                        DsGlyph.checkCircle,
                        size: 20,
                        color: context.ds.success,
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _escalate(
    BuildContext context,
    TicketsBloc bloc,
    Ticket ticket,
  ) async {
    final confirmed = await showDsConfirmDialog(
      context,
      title: 'Escalader ce ticket ?',
      description:
          'Le ticket passe au niveau ${ticket.escalationLevel + 1} et devient prioritaire pour l’équipe interne.',
      confirmLabel: 'Escalader',
      destructive: false,
      icon: DsGlyph.trendingUp,
    );
    if (confirmed) {
      bloc.add(TicketEscalateRequested(id: ticket.id));
    }
  }
}

class _Conversation extends StatelessWidget {
  const _Conversation({
    required this.ticket,
    required this.composer,
    required this.commentType,
    required this.onCommentType,
    required this.onSend,
  });

  final Ticket ticket;
  final TextEditingController composer;
  final CommentType commentType;
  final ValueChanged<CommentType> onCommentType;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final padding = DsSpacing.pagePadding(context.dsDevice);
    final internal = commentType == CommentType.interne;
    final accent = internal ? ds.brandTertiary : ds.brandPrimary;

    return Column(
      children: [
        Expanded(
          child: ticket.comments.isEmpty
              ? const DsEmptyState(
                  compact: true,
                  icon: Icons.forum_rounded,
                  title: 'Aucun échange pour l’instant',
                  description:
                      'Répondez au client, ou laissez une note interne pour l’équipe.',
                )
              : ListView.separated(
                  padding: EdgeInsets.fromLTRB(
                    padding,
                    DsSpacing.s4,
                    padding,
                    DsSpacing.s4,
                  ),
                  itemCount: ticket.comments.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: DsSpacing.s3),
                  itemBuilder: (context, index) =>
                      _CommentBubble(comment: ticket.comments[index]),
                ),
        ),
        Container(
          padding: EdgeInsets.all(padding),
          decoration: BoxDecoration(
            color: ds.surface1,
            border: Border(top: BorderSide(color: ds.borderDefault)),
            boxShadow: ds.elevationSticky,
          ),
          child: SafeArea(
            top: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Le choix public / interne porte le risque metier :
                // il est explicite, colore et libelle en toutes lettres.
                Row(
                  children: [
                    DsFilterChip(
                      label: 'Réponse au client',
                      icon: DsGlyph.client,
                      selected: !internal,
                      onSelected: () => onCommentType(CommentType.public),
                    ),
                    const SizedBox(width: DsSpacing.s2),
                    DsFilterChip(
                      label: 'Note interne',
                      icon: Icons.lock_rounded,
                      tone: ds.brandTertiary,
                      selected: internal,
                      onSelected: () => onCommentType(CommentType.interne),
                    ),
                  ],
                ),
                const SizedBox(height: DsSpacing.s3),
                Container(
                  decoration: BoxDecoration(
                    color: internal ? ds.soft(accent, 0.08) : ds.surface3,
                    borderRadius: DsRadius.mdAll,
                    border: Border.all(
                      color: internal
                          ? ds.softBorder(accent, 0.45)
                          : ds.borderDefault,
                      width: internal ? 2 : 1,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: DsSpacing.s4,
                    vertical: DsSpacing.s2,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: composer,
                          minLines: 1,
                          maxLines: 5,
                          style: TextStyle(
                            fontSize: t.bodySize,
                            color: ds.textPrimary,
                          ),
                          decoration: InputDecoration(
                            isCollapsed: true,
                            border: InputBorder.none,
                            filled: false,
                            hintText: internal
                                ? 'Note interne, invisible pour le client…'
                                : 'Répondre au client…',
                            hintStyle: TextStyle(
                              fontSize: t.bodySize,
                              color: internal ? accent : ds.textTertiary,
                              fontWeight: internal
                                  ? DsWeight.medium
                                  : DsWeight.regular,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: DsSpacing.s2),
                      DsIconButton(
                        icon: DsGlyph.send,
                        label: internal
                            ? 'Enregistrer la note interne'
                            : 'Envoyer au client',
                        tone: accent,
                        onPressed: onSend,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _CommentBubble extends StatelessWidget {
  const _CommentBubble({required this.comment});

  final TicketComment comment;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final internal = comment.isInternal;
    final fromClient = comment.isFromClient;
    final accent = internal
        ? ds.brandTertiary
        : fromClient
            ? ds.brandSecondary
            : ds.brandPrimary;

    return Align(
      alignment: fromClient ? Alignment.centerLeft : Alignment.centerRight,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.75,
        ),
        child: DsCard(
          accent: internal ? ds.brandTertiary : null,
          padding: const EdgeInsets.all(DsSpacing.s4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  DsIcon(
                    comment.isFromAi
                        ? DsGlyph.ai
                        : fromClient
                            ? DsGlyph.client
                            : DsGlyph.support,
                    size: 16,
                    color: accent,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    comment.authorName ??
                        (fromClient ? 'Client' : 'Équipe support'),
                    style: TextStyle(
                      fontSize: t.badgeSize,
                      fontWeight: DsWeight.semibold,
                      color: accent,
                    ),
                  ),
                  if (internal) ...[
                    const SizedBox(width: DsSpacing.s2),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: ds.soft(ds.brandTertiary, 0.16),
                        borderRadius: DsRadius.badgeAll,
                        border:
                            Border.all(color: ds.softBorder(ds.brandTertiary)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          DsIcon(
                            Icons.lock_rounded,
                            size: 13,
                            color: ds.brandTertiary,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            'Invisible pour le client',
                            style: TextStyle(
                              fontSize: t.badgeSize,
                              fontWeight: DsWeight.semibold,
                              color: ds.brandTertiary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: DsSpacing.s2),
              Text(
                comment.content,
                style: TextStyle(
                  fontSize: t.bodySize,
                  height: t.bodyLine / t.bodySize,
                  color: ds.textBody,
                ),
              ),
              const SizedBox(height: DsSpacing.s2),
              Text(
                DateFormat('d MMM yyyy · HH:mm', 'fr_FR')
                    .format(comment.createdAt),
                style: TextStyle(
                  fontSize: t.badgeSize,
                  color: ds.textTertiary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.ticket, this.shrinkWrap = false});

  final Ticket ticket;
  final bool shrinkWrap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return ListView(
      shrinkWrap: shrinkWrap,
      physics: shrinkWrap ? const NeverScrollableScrollPhysics() : null,
      padding: const EdgeInsets.all(DsSpacing.s5),
      children: [
        Wrap(
          spacing: DsSpacing.s2,
          runSpacing: DsSpacing.s2,
          children: [
            DsStatusBadge(
              status: ticket.status.dsStatus,
              size: DsBadgeSize.large,
            ),
            DsPriorityBadge(
              priority: ticket.priority.dsPriority,
              size: DsBadgeSize.large,
            ),
          ],
        ),
        const SizedBox(height: DsSpacing.s4),
        if (ticket.slaBreached)
          Padding(
            padding: const EdgeInsets.only(bottom: DsSpacing.s4),
            child: DsErrorState(
              kind: DsErrorKind.server,
              inline: true,
              title: 'SLA dépassé',
              description:
                  'Le délai de première réponse est écoulé. Traitez ce ticket en priorité.',
            ),
          ),
        Text(
          ticket.description,
          style: TextStyle(
            fontSize: t.bodySize,
            height: t.bodyLine / t.bodySize,
            color: ds.textBody,
          ),
        ),
        const SizedBox(height: DsSpacing.gapCard),
        if (ticket.aiDiagnosis != null) ...[
          DsCard(
            accent: ds.brandSecondary,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    DsIcon(DsGlyph.ai, size: 18, color: ds.brandSecondary),
                    const SizedBox(width: DsSpacing.s2),
                    Text(
                      'Diagnostic IA',
                      style: TextStyle(
                        fontSize: t.labelSize,
                        fontWeight: DsWeight.semibold,
                        color: ds.brandSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: DsSpacing.s2),
                Text(
                  ticket.aiDiagnosis!,
                  style: TextStyle(
                    fontSize: t.captionSize,
                    height: 1.45,
                    color: ds.textBody,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DsSpacing.gapCard),
        ],
        const DsSectionTitle('Informations'),
        const SizedBox(height: DsSpacing.s3),
        _Row(label: 'Client', value: ticket.client?.fullName ?? '—'),
        _Row(label: 'Source', value: ticket.source.displayName),
        _Row(label: 'Catégorie', value: ticket.category?.name ?? '—'),
        _Row(label: 'Assigné à', value: ticket.assignedTo?.toString() ?? '—'),
        _Row(
          label: 'Créé le',
          value: DateFormat('d MMMM yyyy · HH:mm', 'fr_FR')
              .format(ticket.createdAt),
        ),
        if (ticket.escalationLevel > 0)
          _Row(label: 'Escalade', value: 'Niveau ${ticket.escalationLevel}'),
        if (ticket.tags.isNotEmpty) ...[
          const SizedBox(height: DsSpacing.s2),
          Wrap(
            spacing: DsSpacing.s2,
            runSpacing: DsSpacing.s2,
            children: [
              for (final tag in ticket.tags)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: ds.surfaceSunken,
                    borderRadius: DsRadius.fullAll,
                  ),
                  child: Text(
                    tag,
                    style: TextStyle(
                      fontSize: t.badgeSize,
                      color: ds.textSecondary,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Padding(
      padding: const EdgeInsets.only(bottom: DsSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: TextStyle(
                fontSize: t.captionSize,
                color: ds.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: t.bodySize,
                fontWeight: DsWeight.medium,
                color: ds.textBody,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
