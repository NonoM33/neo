import 'package:equatable/equatable.dart';

/// Checklist category enum
enum ChecklistCategory {
  eclairage,
  ouvrants,
  climat,
  securite,
  energie,
  multimedia,
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
      ];

  ChecklistTemplates._();
}
