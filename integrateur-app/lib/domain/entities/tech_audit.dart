// Technical audit definitions and runtime data for appointment visits.

/// Type of input for an audit item
enum AuditItemType { check, text, number, select, rating }

/// Definition of a single audit item (static template)
class AuditItemDef {
  final String id;
  final String label;
  final AuditItemType type;
  final List<String>? options; // for select type
  final String? hint;

  const AuditItemDef({
    required this.id,
    required this.label,
    required this.type,
    this.options,
    this.hint,
  });
}

/// Definition of an audit section (static template)
class AuditSectionDef {
  final String id;
  final String title;
  final String icon; // Material icon name
  final List<AuditItemDef> items;

  const AuditSectionDef({
    required this.id,
    required this.title,
    required this.icon,
    required this.items,
  });
}

/// Runtime data for a single section
class AuditSectionData {
  final Map<String, dynamic> items;
  final String? notes;

  const AuditSectionData({this.items = const {}, this.notes});

  factory AuditSectionData.fromJson(Map<String, dynamic> json) {
    return AuditSectionData(
      items: (json['items'] as Map<String, dynamic>?) ?? {},
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'items': items,
        if (notes != null && notes!.isNotEmpty) 'notes': notes,
      };

  AuditSectionData copyWith({Map<String, dynamic>? items, String? notes}) {
    return AuditSectionData(
      items: items ?? this.items,
      notes: notes ?? this.notes,
    );
  }

  /// Count of filled items
  int filledCount(List<AuditItemDef> defs) {
    int count = 0;
    for (final def in defs) {
      final val = items[def.id];
      if (val == null) continue;
      if (val is bool && val) count++;
      if (val is String && val.isNotEmpty) count++;
      if (val is num) count++;
    }
    return count;
  }
}

/// Complete audit state
class TechAuditData {
  final String? startedAt;
  final int currentSection;
  final Map<String, AuditSectionData> sections;

  const TechAuditData({
    this.startedAt,
    this.currentSection = 0,
    this.sections = const {},
  });

  factory TechAuditData.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const TechAuditData();
    final sectionsJson = json['sections'] as Map<String, dynamic>? ?? {};
    final sections = sectionsJson.map(
      (key, value) => MapEntry(key, AuditSectionData.fromJson(value as Map<String, dynamic>)),
    );
    return TechAuditData(
      startedAt: json['startedAt'] as String?,
      currentSection: json['currentSection'] as int? ?? 0,
      sections: sections,
    );
  }

  Map<String, dynamic> toJson() => {
        if (startedAt != null) 'startedAt': startedAt,
        'currentSection': currentSection,
        'sections': sections.map((k, v) => MapEntry(k, v.toJson())),
      };

  bool get isStarted => startedAt != null;

  /// Overall progress (0.0 to 1.0)
  double get progress {
    final template = TechAuditTemplate.sections;
    int total = 0;
    int filled = 0;
    for (final section in template) {
      total += section.items.length;
      final data = sections[section.id];
      if (data != null) {
        filled += data.filledCount(section.items);
      }
    }
    return total > 0 ? filled / total : 0;
  }

  /// Progress as percentage
  int get progressPercent => (progress * 100).round();

  TechAuditData copyWith({
    String? startedAt,
    int? currentSection,
    Map<String, AuditSectionData>? sections,
  }) {
    return TechAuditData(
      startedAt: startedAt ?? this.startedAt,
      currentSection: currentSection ?? this.currentSection,
      sections: sections ?? this.sections,
    );
  }
}

/// Static template with the 12 audit sections
class TechAuditTemplate {
  TechAuditTemplate._();

  static const List<AuditSectionDef> sections = [
    // 1. Arrivee & Contact
    AuditSectionDef(
      id: 'arrivee',
      title: 'Arrivee & Contact',
      icon: 'door_front',
      items: [
        AuditItemDef(id: 'client_present', label: 'Client present', type: AuditItemType.check),
        AuditItemDef(id: 'acces_logement', label: 'Acces au logement OK', type: AuditItemType.check),
        AuditItemDef(id: 'visite_guidee', label: 'Visite guidee effectuee', type: AuditItemType.check),
        AuditItemDef(id: 'remarques_client', label: 'Remarques du client', type: AuditItemType.text, hint: 'Attentes, contraintes...'),
      ],
    ),
    // 2. Informations logement
    AuditSectionDef(
      id: 'logement',
      title: 'Informations logement',
      icon: 'home',
      items: [
        AuditItemDef(id: 'type_logement', label: 'Type de logement', type: AuditItemType.select, options: ['Maison', 'Appartement', 'Loft', 'Autre']),
        AuditItemDef(id: 'construction', label: 'Periode de construction', type: AuditItemType.select, options: ['Avant 1970', '1970-1990', '1990-2010', 'Apres 2010', 'Neuf']),
        AuditItemDef(id: 'surface', label: 'Surface (m2)', type: AuditItemType.number),
        AuditItemDef(id: 'nb_pieces', label: 'Nombre de pieces', type: AuditItemType.number),
        AuditItemDef(id: 'nb_etages', label: 'Nombre d\'etages', type: AuditItemType.number),
      ],
    ),
    // 3. Tableau electrique
    AuditSectionDef(
      id: 'electricite',
      title: 'Tableau electrique',
      icon: 'bolt',
      items: [
        AuditItemDef(id: 'tableau_accessible', label: 'Tableau accessible', type: AuditItemType.check),
        AuditItemDef(id: 'place_disponible', label: 'Place disponible (modules)', type: AuditItemType.check),
        AuditItemDef(id: 'fil_pilote', label: 'Fil pilote present', type: AuditItemType.check),
        AuditItemDef(id: 'etat_tableau', label: 'Etat general', type: AuditItemType.rating),
        AuditItemDef(id: 'type_disjoncteur', label: 'Type de disjoncteur', type: AuditItemType.select, options: ['Mono', 'Triphasé', 'Inconnu']),
      ],
    ),
    // 4. Reseau & Connectivite
    AuditSectionDef(
      id: 'reseau',
      title: 'Reseau & Connectivite',
      icon: 'wifi',
      items: [
        AuditItemDef(id: 'fai', label: 'FAI / Box', type: AuditItemType.text, hint: 'Orange, Free, SFR...'),
        AuditItemDef(id: 'wifi_ok', label: 'WiFi couvre tout le logement', type: AuditItemType.check),
        AuditItemDef(id: 'ethernet_dispo', label: 'Prises Ethernet disponibles', type: AuditItemType.check),
        AuditItemDef(id: 'qualite_reseau', label: 'Qualite du reseau', type: AuditItemType.rating),
      ],
    ),
    // 5. Eclairage
    AuditSectionDef(
      id: 'eclairage',
      title: 'Eclairage',
      icon: 'lightbulb',
      items: [
        AuditItemDef(id: 'nb_circuits', label: 'Nombre de circuits eclairage', type: AuditItemType.number),
        AuditItemDef(id: 'variateurs_existants', label: 'Variateurs existants', type: AuditItemType.check),
        AuditItemDef(id: 'ampoules_led', label: 'Ampoules LED', type: AuditItemType.check),
        AuditItemDef(id: 'neutre_interrupteur', label: 'Neutre aux interrupteurs', type: AuditItemType.check),
      ],
    ),
    // 6. Volets & Ouvrants
    AuditSectionDef(
      id: 'volets',
      title: 'Volets & Ouvrants',
      icon: 'blinds',
      items: [
        AuditItemDef(id: 'type_volets', label: 'Type de volets', type: AuditItemType.select, options: ['Roulants electriques', 'Roulants manuels', 'Battants', 'Stores', 'Aucun']),
        AuditItemDef(id: 'commande_volets', label: 'Commande actuelle', type: AuditItemType.select, options: ['Individuelle filaire', 'Individuelle radio', 'Centralisee', 'Manuelle']),
        AuditItemDef(id: 'nb_volets', label: 'Nombre de volets', type: AuditItemType.number),
        AuditItemDef(id: 'motorisables', label: 'Motorisation possible', type: AuditItemType.check),
        AuditItemDef(id: 'marque_moteurs', label: 'Marque moteurs (si existant)', type: AuditItemType.check),
      ],
    ),
    // 7. Chauffage & Climatisation
    AuditSectionDef(
      id: 'chauffage',
      title: 'Chauffage & Climatisation',
      icon: 'thermostat',
      items: [
        AuditItemDef(id: 'type_chauffage', label: 'Type de chauffage', type: AuditItemType.select, options: ['Electrique', 'Gaz', 'Pompe a chaleur', 'Fioul', 'Bois', 'Mixte']),
        AuditItemDef(id: 'regulation', label: 'Regulation actuelle', type: AuditItemType.select, options: ['Thermostat central', 'Par piece', 'Aucune', 'Programmateur']),
        AuditItemDef(id: 'marque_chaudiere', label: 'Marque/Modele chaudiere', type: AuditItemType.text, hint: 'Si applicable'),
        AuditItemDef(id: 'nb_radiateurs', label: 'Nombre de radiateurs', type: AuditItemType.number),
        AuditItemDef(id: 'clim_existante', label: 'Climatisation existante', type: AuditItemType.check),
        AuditItemDef(id: 'fil_pilote_chauffage', label: 'Fil pilote sur radiateurs', type: AuditItemType.check),
      ],
    ),
    // 8. Securite
    AuditSectionDef(
      id: 'securite',
      title: 'Securite',
      icon: 'shield',
      items: [
        AuditItemDef(id: 'alarme_existante', label: 'Alarme existante', type: AuditItemType.check),
        AuditItemDef(id: 'cameras_existantes', label: 'Cameras existantes', type: AuditItemType.check),
        AuditItemDef(id: 'detecteurs_fumee', label: 'Detecteurs de fumee', type: AuditItemType.check),
        AuditItemDef(id: 'marque_alarme', label: 'Marque alarme (si existante)', type: AuditItemType.text),
        AuditItemDef(id: 'nb_ouvrants_securiser', label: 'Ouvrants a securiser', type: AuditItemType.number),
        AuditItemDef(id: 'type_serrure', label: 'Type de serrure entree', type: AuditItemType.select, options: ['Standard', 'Multipoint', 'Connectee', 'Autre']),
      ],
    ),
    // 9. Multimedia
    AuditSectionDef(
      id: 'multimedia',
      title: 'Multimedia',
      icon: 'tv',
      items: [
        AuditItemDef(id: 'nb_tv', label: 'Nombre de TV', type: AuditItemType.number),
        AuditItemDef(id: 'enceintes_existantes', label: 'Enceintes connectees', type: AuditItemType.check),
        AuditItemDef(id: 'multiroom_souhaite', label: 'Multi-room souhaite', type: AuditItemType.check),
      ],
    ),
    // 10. Exterieur
    AuditSectionDef(
      id: 'exterieur',
      title: 'Exterieur',
      icon: 'yard',
      items: [
        AuditItemDef(id: 'jardin', label: 'Jardin / Terrasse', type: AuditItemType.check),
        AuditItemDef(id: 'eclairage_ext', label: 'Eclairage exterieur', type: AuditItemType.check),
        AuditItemDef(id: 'arrosage', label: 'Arrosage automatique', type: AuditItemType.check),
        AuditItemDef(id: 'portail_garage', label: 'Portail / Garage motorise', type: AuditItemType.check),
      ],
    ),
    // 11. Besoins & Priorites client
    AuditSectionDef(
      id: 'besoins',
      title: 'Besoins & Priorites',
      icon: 'priority_high',
      items: [
        AuditItemDef(id: 'priorite_1', label: 'Priorite n°1', type: AuditItemType.text, hint: 'Ex: securite, confort, economies...'),
        AuditItemDef(id: 'priorite_2', label: 'Priorite n°2', type: AuditItemType.text),
        AuditItemDef(id: 'priorite_3', label: 'Priorite n°3', type: AuditItemType.text),
        AuditItemDef(id: 'budget', label: 'Budget envisage', type: AuditItemType.text, hint: 'Fourchette ou montant'),
        AuditItemDef(id: 'delai', label: 'Delai souhaite', type: AuditItemType.text, hint: 'Ex: 1 mois, avant l\'ete...'),
      ],
    ),
    // 12. Synthese
    AuditSectionDef(
      id: 'synthese',
      title: 'Synthese',
      icon: 'summarize',
      items: [
        AuditItemDef(id: 'recommandations', label: 'Recommandations', type: AuditItemType.text, hint: 'Solutions proposees au client'),
        AuditItemDef(id: 'points_attention', label: 'Points d\'attention', type: AuditItemType.text, hint: 'Contraintes techniques, risques...'),
        AuditItemDef(id: 'prochaines_etapes', label: 'Prochaines etapes', type: AuditItemType.text, hint: 'Devis, 2eme visite, commande...'),
      ],
    ),
  ];
}
