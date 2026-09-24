import '../entities/box.dart';
import 'auth_repository.dart';

/// Box repository interface
abstract class BoxRepository {
  /// Rattache la box dont l'installateur a scanne le QR au client du projet.
  Future<Result<ClaimedBox>> claimBox({
    required String provisioningToken,
    required String clientId,
  });
}
