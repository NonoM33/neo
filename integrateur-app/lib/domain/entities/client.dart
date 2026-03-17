import 'package:equatable/equatable.dart';

/// Client entity matching backend clients table
class Client extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? address;
  final String? city;
  final String? postalCode;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Client({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.address,
    this.city,
    this.postalCode,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  String get fullName => '$firstName $lastName';

  String get initials {
    final firstInitial =
        firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$firstInitial$lastInitial';
  }

  String get fullAddress {
    final parts = <String>[];
    if (address != null && address!.isNotEmpty) parts.add(address!);
    if (postalCode != null && postalCode!.isNotEmpty) parts.add(postalCode!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    return parts.join(', ');
  }

  String get shortAddress {
    if (city != null && postalCode != null) {
      return '$city ($postalCode)';
    }
    return city ?? '';
  }

  Client copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? address,
    String? city,
    String? postalCode,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Client(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      city: city ?? this.city,
      postalCode: postalCode ?? this.postalCode,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        notes,
        createdAt,
        updatedAt,
      ];
}
