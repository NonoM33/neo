import 'package:equatable/equatable.dart';

/// Address value object
class Address extends Equatable {
  final String street;
  final String postalCode;
  final String city;
  final String? complement;

  const Address({
    required this.street,
    required this.postalCode,
    required this.city,
    this.complement,
  });

  String get fullAddress {
    final buffer = StringBuffer()
      ..write(street)
      ..write(', ')
      ..write(postalCode)
      ..write(' ')
      ..write(city);
    if (complement != null && complement!.isNotEmpty) {
      buffer.write(' - $complement');
    }
    return buffer.toString();
  }

  String get shortAddress => '$city ($postalCode)';

  Address copyWith({
    String? street,
    String? postalCode,
    String? city,
    String? complement,
  }) {
    return Address(
      street: street ?? this.street,
      postalCode: postalCode ?? this.postalCode,
      city: city ?? this.city,
      complement: complement ?? this.complement,
    );
  }

  @override
  List<Object?> get props => [street, postalCode, city, complement];
}

/// Client entity
class Client extends Equatable {
  final String? id;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final Address address;
  final String? notes;

  const Client({
    this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.address,
    this.notes,
  });

  String get fullName => '$firstName $lastName';

  String get initials {
    final firstInitial =
        firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$firstInitial$lastInitial';
  }

  Client copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    Address? address,
    String? notes,
  }) {
    return Client(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      notes: notes ?? this.notes,
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
        notes,
      ];
}
