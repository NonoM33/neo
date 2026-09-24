import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Tous les statuts affichables de l'app : projet, devis, ticket, rendez-vous.
///
/// Chaque statut associe **couleur + icone + libelle** : la couleur ne porte
/// jamais seule l'information (daltonisme, brief §11).
enum DsStatus {
  // Projet / devis.
  brouillon,
  enCours,
  termine,
  archive,
  audit,
  envoye,
  signe,
  accepte,
  refuse,
  expire,
  // Ticket.
  nouveau,
  ouvert,
  attenteClient,
  attenteInterne,
  escalade,
  resolu,
  ferme,
  // Rendez-vous.
  propose,
  confirme,
  annule,
  noShow;

  String get label => switch (this) {
        DsStatus.brouillon => 'Brouillon',
        DsStatus.enCours => 'En cours',
        DsStatus.termine => 'Terminé',
        DsStatus.archive => 'Archivé',
        DsStatus.audit => 'Audit',
        DsStatus.envoye => 'Envoyé',
        DsStatus.signe => 'Signé',
        DsStatus.accepte => 'Accepté',
        DsStatus.refuse => 'Refusé',
        DsStatus.expire => 'Expiré',
        DsStatus.nouveau => 'Nouveau',
        DsStatus.ouvert => 'Ouvert',
        DsStatus.attenteClient => 'Attente client',
        DsStatus.attenteInterne => 'Attente interne',
        DsStatus.escalade => 'Escaladé',
        DsStatus.resolu => 'Résolu',
        DsStatus.ferme => 'Fermé',
        DsStatus.propose => 'Proposé',
        DsStatus.confirme => 'Confirmé',
        DsStatus.annule => 'Annulé',
        DsStatus.noShow => 'No-show',
      };

  IconData get icon => switch (this) {
        DsStatus.brouillon => DsGlyph.editNote,
        DsStatus.enCours => DsGlyph.pending,
        DsStatus.termine => DsGlyph.checkCircle,
        DsStatus.archive => DsGlyph.archive,
        DsStatus.audit => DsGlyph.audit,
        DsStatus.envoye => DsGlyph.send,
        DsStatus.signe => DsGlyph.signature,
        DsStatus.accepte => DsGlyph.taskAlt,
        DsStatus.refuse => DsGlyph.cancel,
        DsStatus.expire => DsGlyph.schedule,
        DsStatus.nouveau => DsGlyph.fiberNew,
        DsStatus.ouvert => DsGlyph.folderOpen,
        DsStatus.attenteClient => DsGlyph.hourglassTop,
        DsStatus.attenteInterne => DsGlyph.hourglassBottom,
        DsStatus.escalade => DsGlyph.trendingUp,
        DsStatus.resolu => DsGlyph.checkCircle,
        DsStatus.ferme => DsGlyph.lock,
        DsStatus.propose => DsGlyph.help,
        DsStatus.confirme => DsGlyph.eventAvailable,
        DsStatus.annule => DsGlyph.eventBusy,
        DsStatus.noShow => DsGlyph.personOff,
      };

  Color color(DsColors ds) => switch (this) {
        DsStatus.brouillon => ds.statusBrouillon,
        DsStatus.enCours => ds.statusEnCours,
        DsStatus.termine => ds.statusTermine,
        DsStatus.archive => ds.statusArchive,
        DsStatus.audit => ds.statusAudit,
        DsStatus.envoye => ds.statusDevisEnvoye,
        DsStatus.signe => ds.statusSigne,
        DsStatus.accepte => ds.statusSigne,
        DsStatus.refuse => ds.statusRefuse,
        DsStatus.expire => ds.statusExpire,
        DsStatus.nouveau => ds.statusEnCours,
        DsStatus.ouvert => ds.brandPrimary,
        DsStatus.attenteClient => ds.brandTertiary,
        DsStatus.attenteInterne => ds.statusArchive,
        DsStatus.escalade => ds.priorityUrgente,
        DsStatus.resolu => ds.success,
        DsStatus.ferme => ds.statusArchive,
        DsStatus.propose => ds.statusBrouillon,
        DsStatus.confirme => ds.brandPrimary,
        DsStatus.annule => ds.error,
        DsStatus.noShow => ds.priorityUrgente,
      };
}

enum DsBadgeTone { soft, solid }

enum DsBadgeSize { medium, large }

/// Badge de statut — fond opaque tinte, jamais `alpha(20)` : lisible en plein soleil.
class DsStatusBadge extends StatelessWidget {
  const DsStatusBadge({
    required this.status,
    this.label,
    this.tone = DsBadgeTone.soft,
    this.size = DsBadgeSize.medium,
    super.key,
  });

  final DsStatus status;

  /// Surcharge du libelle (le vocabulaire metier du back peut differer).
  final String? label;
  final DsBadgeTone tone;
  final DsBadgeSize size;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final color = status.color(ds);
    final solid = tone == DsBadgeTone.solid;
    final large = size == DsBadgeSize.large;
    final onSolid = ds.isDark ? ds.surfaceBase : Colors.white;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 12 : 9,
        vertical: large ? 6 : 4,
      ),
      decoration: BoxDecoration(
        color: solid ? color : ds.soft(color),
        borderRadius: DsRadius.badgeAll,
        border: Border.all(
          color: solid ? Colors.transparent : ds.softBorder(color),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DsIcon(
            status.icon,
            size: large ? 18 : 15,
            color: solid ? onSolid : color,
          ),
          const SizedBox(width: 5),
          Text(
            label ?? status.label,
            style: TextStyle(
              fontSize:
                  large ? context.dsType.labelSize : context.dsType.badgeSize,
              fontWeight: DsWeight.semibold,
              letterSpacing: 0.3,
              color: solid ? onSolid : color,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}
