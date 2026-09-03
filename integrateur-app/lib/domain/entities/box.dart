import 'package:equatable/equatable.dart';

/// Une box domotique Neo telle que le backend la renvoie apres un rattachement.
///
/// Le jeton et la cle ne transitent jamais par l'app : elle ne connait que
/// le suffixe affiche sur la box (les 4 derniers caracteres du code).
class ClaimedBox extends Equatable {
  final String id;
  final String tokenSuffix;
  final String status;
  final String? clientId;

  const ClaimedBox({
    required this.id,
    required this.tokenSuffix,
    required this.status,
    this.clientId,
  });

  @override
  List<Object?> get props => [id, tokenSuffix, status, clientId];
}

/// Normalise ce qui sort du scanner ou du clavier en jeton canonique.
///
/// Meme regle que la box et le backend (Crockford) : casse, tirets et espaces
/// ignores, `NEO:` du QR retire, O -> 0 et I/L -> 1 corriges. Retourne null si
/// le resultat n'a pas la forme d'un jeton (20 caracteres de l'alphabet).
String? normalizeProvisioningToken(String raw) {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var cleaned = raw.trim().toUpperCase().replaceAll(RegExp(r'[-\s]'), '');
  if (cleaned.startsWith('NEO:')) cleaned = cleaned.substring(4);
  cleaned = cleaned.replaceAll('O', '0').replaceAll('I', '1').replaceAll('L', '1');
  if (cleaned.length != 20) return null;
  if (cleaned.split('').any((c) => !alphabet.contains(c))) return null;
  return cleaned;
}
