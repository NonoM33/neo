import 'package:equatable/equatable.dart';

/// Checklist category enum
enum ChecklistCategory {
  eclairage,
  ouvrants,
  climat,
  securite,
  energie,
  multimedia,
  infrastructure,
  reseau,
  chauffage,
  autre;

  String get displayName {
    switch (this) {
      case ChecklistCategory.eclairage:
        return 'Éclairage';
      case ChecklistCategory.ouvrants:
        return 'Ouvrants';
      case ChecklistCategory.climat:
        return 'Climat';
      case ChecklistCategory.securite:
        return 'Sécurité';
      case ChecklistCategory.energie:
        return 'Énergie';
      case ChecklistCategory.multimedia:
        return 'Multimédia';
      case ChecklistCategory.infrastructure:
        return 'Infrastructure';
      case ChecklistCategory.reseau:
        return 'Réseau';
      case ChecklistCategory.chauffage:
        return 'Chauffage';
      case ChecklistCategory.autre:
        return 'Autre';
    }
  }

  String get icon {
    switch (this) {
      case ChecklistCategory.eclairage:
        return 'lightbulb';
      case ChecklistCategory.ouvrants:
        return 'window';
      case ChecklistCategory.climat:
        return 'thermostat';
      case ChecklistCategory.securite:
        return 'security';
      case ChecklistCategory.energie:
        return 'bolt';
      case ChecklistCategory.multimedia:
        return 'tv';
      case ChecklistCategory.infrastructure:
        return 'electrical_services';
      case ChecklistCategory.reseau:
        return 'wifi';
      case ChecklistCategory.chauffage:
        return 'thermostat';
      case ChecklistCategory.autre:
        return 'category';
    }
  }

  static ChecklistCategory fromString(String value) {
    return ChecklistCategory.values.firstWhere(
      (cat) => cat.name == value.toLowerCase(),
      orElse: () => ChecklistCategory.autre,
    );
  }
}

/// Checklist item entity
class ChecklistItem extends Equatable {
  final String id;
  final String label;
  final ChecklistCategory category;
  final bool isChecked;
  final int? quantity;
  final String? notes;
  final String? productId;

  const ChecklistItem({
    required this.id,
    required this.label,
    required this.category,
    this.isChecked = false,
    this.quantity,
    this.notes,
    this.productId,
  });

  ChecklistItem copyWith({
    String? id,
    String? label,
    ChecklistCategory? category,
    bool? isChecked,
    int? quantity,
    String? notes,
    String? productId,
  }) {
    return ChecklistItem(
      id: id ?? this.id,
      label: label ?? this.label,
      category: category ?? this.category,
      isChecked: isChecked ?? this.isChecked,
      quantity: quantity ?? this.quantity,
      notes: notes ?? this.notes,
      productId: productId ?? this.productId,
    );
  }

  @override
  List<Object?> get props => [
        id,
        label,
        category,
        isChecked,
        quantity,
        notes,
        productId,
      ];
}

/// Predefined checklist templates
class ChecklistTemplates {
  static List<ChecklistItem> get defaultItems => [
        // Éclairage
        const ChecklistItem(
          id: 'ecl_1',
          label: 'Plafonnier connecté',
          category: ChecklistCategory.eclairage,
        ),
        const ChecklistItem(
          id: 'ecl_2',
          label: 'Spots / Encastrés',
          category: ChecklistCategory.eclairage,
        ),
        const ChecklistItem(
          id: 'ecl_3',
          label: 'Lampes d\'appoint',
          category: ChecklistCategory.eclairage,
        ),
        const ChecklistItem(
          id: 'ecl_4',
          label: 'Bandeau LED',
          category: ChecklistCategory.eclairage,
        ),
        const ChecklistItem(
          id: 'ecl_5',
          label: 'Interrupteur connecté',
          category: ChecklistCategory.eclairage,
        ),
        const ChecklistItem(
          id: 'ecl_6',
          label: 'Variateur',
          category: ChecklistCategory.eclairage,
        ),

        // Ouvrants
        const ChecklistItem(
          id: 'ouv_1',
          label: 'Volets roulants',
          category: ChecklistCategory.ouvrants,
        ),
        const ChecklistItem(
          id: 'ouv_2',
          label: 'Store banne',
          category: ChecklistCategory.ouvrants,
        ),
        const ChecklistItem(
          id: 'ouv_3',
          label: 'Porte de garage',
          category: ChecklistCategory.ouvrants,
        ),
        const ChecklistItem(
          id: 'ouv_4',
          label: 'Portail',
          category: ChecklistCategory.ouvrants,
        ),

        // Climat
        const ChecklistItem(
          id: 'cli_1',
          label: 'Thermostat',
          category: ChecklistCategory.climat,
        ),
        const ChecklistItem(
          id: 'cli_2',
          label: 'Radiateur électrique',
          category: ChecklistCategory.climat,
        ),
        const ChecklistItem(
          id: 'cli_3',
          label: 'Tête thermostatique',
          category: ChecklistCategory.climat,
        ),
        const ChecklistItem(
          id: 'cli_4',
          label: 'Climatisation',
          category: ChecklistCategory.climat,
        ),
        const ChecklistItem(
          id: 'cli_5',
          label: 'Ventilateur',
          category: ChecklistCategory.climat,
        ),
        const ChecklistItem(
          id: 'cli_6',
          label: 'Capteur température/humidité',
          category: ChecklistCategory.climat,
        ),

        // Sécurité
        const ChecklistItem(
          id: 'sec_1',
          label: 'Caméra intérieure',
          category: ChecklistCategory.securite,
        ),
        const ChecklistItem(
          id: 'sec_2',
          label: 'Caméra extérieure',
          category: ChecklistCategory.securite,
        ),
        const ChecklistItem(
          id: 'sec_3',
          label: 'Détecteur mouvement',
          category: ChecklistCategory.securite,
        ),
        const ChecklistItem(
          id: 'sec_4',
          label: 'Détecteur ouverture',
          category: ChecklistCategory.securite,
        ),
        const ChecklistItem(
          id: 'sec_5',
          label: 'Détecteur fumée',
          category: ChecklistCategory.securite,
        ),
        const ChecklistItem(
          id: 'sec_6',
          label: 'Détecteur inondation',
          category: ChecklistCategory.securite,
        ),
        const ChecklistItem(
          id: 'sec_7',
          label: 'Sirène',
          category: ChecklistCategory.securite,
        ),

        // Énergie
        const ChecklistItem(
          id: 'ene_1',
          label: 'Prise connectée',
          category: ChecklistCategory.energie,
        ),
        const ChecklistItem(
          id: 'ene_2',
          label: 'Compteur énergie',
          category: ChecklistCategory.energie,
        ),
        const ChecklistItem(
          id: 'ene_3',
          label: 'Délesteur',
          category: ChecklistCategory.energie,
        ),

        // Multimédia
        const ChecklistItem(
          id: 'mul_1',
          label: 'TV connectée',
          category: ChecklistCategory.multimedia,
        ),
        const ChecklistItem(
          id: 'mul_2',
          label: 'Enceinte connectée',
          category: ChecklistCategory.multimedia,
        ),
        const ChecklistItem(
          id: 'mul_3',
          label: 'Hub/Bridge',
          category: ChecklistCategory.multimedia,
        ),
        const ChecklistItem(
          id: 'mul_4',
          label: 'Télécommande universelle',
          category: ChecklistCategory.multimedia,
        ),

        // Infrastructure
        const ChecklistItem(
          id: 'inf_1',
          label: 'Tableau électrique accessible',
          category: ChecklistCategory.infrastructure,
        ),
        const ChecklistItem(
          id: 'inf_2',
          label: 'Disjoncteurs libres disponibles',
          category: ChecklistCategory.infrastructure,
        ),
        const ChecklistItem(
          id: 'inf_3',
          label: 'Protection différentielle 30mA',
          category: ChecklistCategory.infrastructure,
        ),
        const ChecklistItem(
          id: 'inf_4',
          label: 'Passage câbles possible (combles/cave)',
          category: ChecklistCategory.infrastructure,
        ),
        const ChecklistItem(
          id: 'inf_5',
          label: 'Prises RJ45 existantes',
          category: ChecklistCategory.infrastructure,
        ),
        const ChecklistItem(
          id: 'inf_6',
          label: 'Isolation double vitrage',
          category: ChecklistCategory.infrastructure,
        ),

        // Réseau
        const ChecklistItem(
          id: 'res_1',
          label: 'Box Internet accessible',
          category: ChecklistCategory.reseau,
        ),
        const ChecklistItem(
          id: 'res_2',
          label: 'WiFi 2.4GHz disponible',
          category: ChecklistCategory.reseau,
        ),
        const ChecklistItem(
          id: 'res_3',
          label: 'WiFi 5GHz disponible',
          category: ChecklistCategory.reseau,
        ),
        const ChecklistItem(
          id: 'res_4',
          label: 'Signal WiFi suffisant (> -65 dBm)',
          category: ChecklistCategory.reseau,
        ),
        const ChecklistItem(
          id: 'res_5',
          label: 'Câble RJ45 dans la pièce',
          category: ChecklistCategory.reseau,
        ),

        // Chauffage
        const ChecklistItem(
          id: 'cha_1',
          label: 'Type de chauffage identifié',
          category: ChecklistCategory.chauffage,
        ),
        const ChecklistItem(
          id: 'cha_2',
          label: 'Thermostat existant',
          category: ChecklistCategory.chauffage,
        ),
        const ChecklistItem(
          id: 'cha_3',
          label: 'Radiateurs eau chaude',
          category: ChecklistCategory.chauffage,
        ),
        const ChecklistItem(
          id: 'cha_4',
          label: 'Convecteurs électriques',
          category: ChecklistCategory.chauffage,
        ),
        const ChecklistItem(
          id: 'cha_5',
          label: 'Plancher chauffant',
          category: ChecklistCategory.chauffage,
        ),
        const ChecklistItem(
          id: 'cha_6',
          label: 'Climatisation réversible',
          category: ChecklistCategory.chauffage,
        ),
      ];

  /// Returns template items for a given room type
  static List<ChecklistItem> forRoomType(String roomType) {
    final base = _baseItems;
    switch (roomType) {
      case 'cuisine':
        return [...base, ..._cuisineItems];
      case 'salle_de_bain':
        return [...base, ..._salledebainItems];
      case 'garage':
        return [...base, ..._garageItems];
      case 'exterieur':
        return [..._exteriorItems];
      case 'salon':
      case 'chambre':
      case 'bureau':
      case 'autre':
      default:
        return base;
    }
  }

  /// Base items for all rooms
  static List<ChecklistItem> get _baseItems => [
        // Éclairage
        const ChecklistItem(id: 'ecl_1', label: 'Plafonnier connecté', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'ecl_2', label: 'Spots / Encastrés', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'ecl_3', label: 'Bandeau LED', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'ecl_4', label: 'Interrupteur connecté', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'ecl_5', label: 'Variateur', category: ChecklistCategory.eclairage),
        // Ouvrants
        const ChecklistItem(id: 'ouv_1', label: 'Volets roulants', category: ChecklistCategory.ouvrants),
        // Sécurité
        const ChecklistItem(id: 'sec_3', label: 'Détecteur mouvement', category: ChecklistCategory.securite),
        const ChecklistItem(id: 'sec_4', label: 'Détecteur ouverture', category: ChecklistCategory.securite),
        const ChecklistItem(id: 'sec_5', label: 'Détecteur fumée', category: ChecklistCategory.securite),
        // Énergie
        const ChecklistItem(id: 'ene_1', label: 'Prise connectée', category: ChecklistCategory.energie),
        // Réseau
        const ChecklistItem(id: 'res_4', label: 'Signal WiFi suffisant (> -65 dBm)', category: ChecklistCategory.reseau),
        // Chauffage
        const ChecklistItem(id: 'cha_1', label: 'Type de chauffage identifié', category: ChecklistCategory.chauffage),
        const ChecklistItem(id: 'cha_2', label: 'Thermostat existant', category: ChecklistCategory.chauffage),
        // Multimédia
        const ChecklistItem(id: 'mul_3', label: 'Hub/Bridge domotique', category: ChecklistCategory.multimedia),
      ];

  static List<ChecklistItem> get _cuisineItems => [
        const ChecklistItem(id: 'cui_1', label: 'Hotte connectée', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'cui_2', label: 'Réfrigérateur/congélateur connecté', category: ChecklistCategory.energie),
        const ChecklistItem(id: 'cui_3', label: 'Four connecté', category: ChecklistCategory.energie),
        const ChecklistItem(id: 'cui_4', label: 'Lave-vaisselle connecté', category: ChecklistCategory.energie),
        const ChecklistItem(id: 'cui_5', label: 'Prises plan de travail (quantité)', category: ChecklistCategory.energie),
        const ChecklistItem(id: 'cui_6', label: 'Détecteur inondation (sous évier)', category: ChecklistCategory.securite),
      ];

  static List<ChecklistItem> get _salledebainItems => [
        const ChecklistItem(id: 'sdb_1', label: 'Sèche-serviettes connecté', category: ChecklistCategory.chauffage),
        const ChecklistItem(id: 'sdb_2', label: 'VMC hygro-réglable', category: ChecklistCategory.climat),
        const ChecklistItem(id: 'sdb_3', label: 'Miroir connecté avec éclairage', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'sdb_4', label: 'Détecteur inondation', category: ChecklistCategory.securite),
        const ChecklistItem(id: 'sdb_5', label: 'Capteur humidité', category: ChecklistCategory.climat),
      ];

  static List<ChecklistItem> get _garageItems => [
        const ChecklistItem(id: 'gar_1', label: 'Porte de garage motorisée', category: ChecklistCategory.ouvrants),
        const ChecklistItem(id: 'gar_2', label: 'Caméra garage', category: ChecklistCategory.securite),
        const ChecklistItem(id: 'gar_3', label: 'Prise véhicule électrique (IRVE)', category: ChecklistCategory.energie),
        const ChecklistItem(id: 'gar_4', label: 'Éclairage avec détecteur', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'gar_5', label: 'Détecteur gaz (si chaudière)', category: ChecklistCategory.securite),
      ];

  static List<ChecklistItem> get _exteriorItems => [
        const ChecklistItem(id: 'ext_1', label: 'Portail motorisé', category: ChecklistCategory.ouvrants),
        const ChecklistItem(id: 'ext_2', label: 'Portillon motorisé', category: ChecklistCategory.ouvrants),
        const ChecklistItem(id: 'ext_3', label: 'Éclairage extérieur connecté', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'ext_4', label: 'Éclairage avec détecteur présence', category: ChecklistCategory.eclairage),
        const ChecklistItem(id: 'ext_5', label: 'Caméra extérieure', category: ChecklistCategory.securite),
        const ChecklistItem(id: 'ext_6', label: 'Interphone/Visiophone', category: ChecklistCategory.securite),
        const ChecklistItem(id: 'ext_7', label: 'Arrosage automatique', category: ChecklistCategory.energie),
        const ChecklistItem(id: 'ext_8', label: 'Store banne motorisé', category: ChecklistCategory.ouvrants),
      ];

  ChecklistTemplates._();
}
