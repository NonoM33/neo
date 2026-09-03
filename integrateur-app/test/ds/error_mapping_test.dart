import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Non-regression : une session expiree etait annoncee « Serveur injoignable »
/// parce que le message backend (« Token manquant ») ne correspondait a aucun
/// mot-cle et tombait dans le cas par defaut. L'app accusait le serveur d'une
/// panne inexistante et n'orientait pas vers la reconnexion.
void main() {
  group('qualification des erreurs', () {
    test('un defaut de jeton est une session expiree, pas une panne serveur',
        () {
      for (final message in [
        'Token manquant',
        'Token expiré',
        'UNAUTHORIZED',
        'Non autorisé',
        'Session expirée',
        'Erreur 401',
      ]) {
        expect(
          DsErrorKind.fromMessage(message),
          DsErrorKind.session,
          reason: '« $message » doit orienter vers la reconnexion',
        );
      }
    });

    test('les pannes reseau restent qualifiees comme telles', () {
      for (final message in [
        'SocketException: failed host lookup',
        'Connection timeout',
        'Erreur réseau',
      ]) {
        expect(DsErrorKind.fromMessage(message), DsErrorKind.network);
      }
    });

    test('une vraie panne serveur reste une panne serveur', () {
      expect(
        DsErrorKind.fromMessage('Internal server error (500)'),
        DsErrorKind.server,
      );
    });

    test('le libelle de session ne parle pas de panne serveur', () {
      expect(DsErrorKind.session.title, 'Session expirée');
      expect(DsErrorKind.session.description.toLowerCase(),
          isNot(contains('serveur')));
    });
  });
}
