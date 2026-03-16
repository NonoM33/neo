/// Form validators
class Validators {
  /// Validate required field
  static String? required(String? value, {String? fieldName}) {
    if (value == null || value.trim().isEmpty) {
      return fieldName != null
          ? '$fieldName est requis'
          : 'Ce champ est requis';
    }
    return null;
  }

  /// Validate email format
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'L\'email est requis';
    }
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return 'Format d\'email invalide';
    }
    return null;
  }

  /// Validate password
  static String? password(String? value, {int minLength = 8}) {
    if (value == null || value.isEmpty) {
      return 'Le mot de passe est requis';
    }
    if (value.length < minLength) {
      return 'Le mot de passe doit contenir au moins $minLength caractères';
    }
    return null;
  }

  /// Validate password confirmation
  static String? passwordConfirmation(String? value, String? password) {
    if (value == null || value.isEmpty) {
      return 'La confirmation est requise';
    }
    if (value != password) {
      return 'Les mots de passe ne correspondent pas';
    }
    return null;
  }

  /// Validate phone number (French format)
  static String? phone(String? value) {
    if (value == null || value.isEmpty) {
      return null; // Phone is optional
    }
    final phoneRegex =
        RegExp(r'^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$');
    if (!phoneRegex.hasMatch(value)) {
      return 'Format de téléphone invalide';
    }
    return null;
  }

  /// Validate postal code (French format)
  static String? postalCode(String? value) {
    if (value == null || value.isEmpty) {
      return 'Le code postal est requis';
    }
    final postalRegex = RegExp(r'^\d{5}$');
    if (!postalRegex.hasMatch(value)) {
      return 'Code postal invalide (5 chiffres)';
    }
    return null;
  }

  /// Validate numeric value
  static String? numeric(String? value, {String? fieldName}) {
    if (value == null || value.isEmpty) {
      return null; // Let required handle this
    }
    if (double.tryParse(value) == null) {
      return fieldName != null
          ? '$fieldName doit être un nombre'
          : 'Valeur numérique invalide';
    }
    return null;
  }

  /// Validate positive number
  static String? positiveNumber(String? value, {String? fieldName}) {
    if (value == null || value.isEmpty) {
      return null;
    }
    final number = double.tryParse(value);
    if (number == null) {
      return 'Valeur numérique invalide';
    }
    if (number <= 0) {
      return fieldName != null
          ? '$fieldName doit être supérieur à 0'
          : 'La valeur doit être supérieure à 0';
    }
    return null;
  }

  /// Validate min length
  static String? minLength(String? value, int min, {String? fieldName}) {
    if (value == null || value.isEmpty) {
      return null;
    }
    if (value.length < min) {
      return fieldName != null
          ? '$fieldName doit contenir au moins $min caractères'
          : 'Doit contenir au moins $min caractères';
    }
    return null;
  }

  /// Validate max length
  static String? maxLength(String? value, int max, {String? fieldName}) {
    if (value == null || value.isEmpty) {
      return null;
    }
    if (value.length > max) {
      return fieldName != null
          ? '$fieldName ne peut pas dépasser $max caractères'
          : 'Ne peut pas dépasser $max caractères';
    }
    return null;
  }

  /// Combine multiple validators
  static String? Function(String?) combine(
    List<String? Function(String?)> validators,
  ) {
    return (value) {
      for (final validator in validators) {
        final error = validator(value);
        if (error != null) return error;
      }
      return null;
    };
  }

  Validators._();
}
