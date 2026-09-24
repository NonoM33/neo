import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/domain/entities/box.dart';

// Ecrit depuis la spec du jeton (20 caracteres Crockford), pas depuis le code :
// les memes cas que cote box (token.py) et backend (boxes.domain.ts).
void main() {
  const valid = '7K3M9PQR2STVWXYZ4ABC';

  test('accepte un jeton canonique', () {
    expect(normalizeProvisioningToken(valid), valid);
  });

  test('accepte le contenu du QR et le code recopie avec tirets/minuscules', () {
    expect(normalizeProvisioningToken('NEO:$valid'), valid);
    expect(normalizeProvisioningToken(' 7k3m-9pqr-2stv-wxyz-4abc '), valid);
  });

  test('corrige O->0 et I/L->1 au lieu de rejeter', () {
    expect(normalizeProvisioningToken('OK3M9PQR2STVWXYZ4ABC'), '0K3M9PQR2STVWXYZ4ABC');
    expect(normalizeProvisioningToken('iK3M9PQR2STVWXYZ4ABl'), '1K3M9PQR2STVWXYZ4AB1');
  });

  test('refuse longueur et alphabet incorrects', () {
    for (final raw in ['', '7K3M', '${valid}A', '7K3M9PQR2STVWXYZ4ABU', '7K3M9PQR2STVWXYZ4AB!']) {
      expect(normalizeProvisioningToken(raw), isNull, reason: raw);
    }
  });

  test('ignore un QR qui n est pas celui d une box', () {
    expect(normalizeProvisioningToken('https://neo-domotique.fr/aide/E01'), isNull);
  });
}
