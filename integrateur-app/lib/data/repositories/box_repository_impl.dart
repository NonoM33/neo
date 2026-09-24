import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/box.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/box_repository.dart';
import '../datasources/remote/box_remote_datasource.dart';

class BoxRepositoryImpl implements BoxRepository {
  final BoxRemoteDataSource _remoteDataSource;

  BoxRepositoryImpl({required BoxRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<ClaimedBox>> claimBox({
    required String provisioningToken,
    required String clientId,
  }) async {
    try {
      final box = await _remoteDataSource.claim(
        provisioningToken: provisioningToken,
        clientId: clientId,
      );
      return Success(box);
    } on NotFoundException {
      return const Error(NotFoundFailure(
        message: 'Box introuvable : est-elle allumée et connectée à Internet ?',
      ));
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } on AppException catch (e) {
      // 409 « déjà rattachée », 5xx… : le message du backend est parlant.
      return Error(ServerFailure(message: e.message, code: e.code));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }
}
