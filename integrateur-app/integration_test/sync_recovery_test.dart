import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:neo_integrateur/core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:neo_integrateur/core/di/providers.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/core/storage/hive_storage.dart';
import 'package:neo_integrateur/data/repositories/outbox_sender_impl.dart';
import 'package:neo_integrateur/data/repositories/outbox_store_impl.dart';
import 'package:neo_integrateur/domain/entities/checklist_item.dart';
import 'package:neo_integrateur/domain/entities/outbox_entry.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/services/outbox_replay.dart';

/// Reprise apres coupure — la promesse faite a l'integrateur.
///
/// « Vos audits en cours restent enregistres sur cet appareil » : une saisie
/// faite en sous-sol doit arriver au bureau une fois le reseau revenu.
///
///   flutter test integration_test/sync_recovery_test.dart -d UDID \
///     --dart-define=E2E_ITEM_ID=identifiant du point de controle
///
/// La coupure est obtenue en pointant la pile de l'app sur un port mort : du
/// point de vue du client HTTP, c'est exactement une connexion refusee. Le
/// tout tient dans UNE execution, car reinstaller l'app entre deux passages
/// efface ses donnees locales — la file n'y survivrait pas.
///
/// La pile est celle de l'app (memes providers, meme Hive, meme API) mais
/// sans interface : l'ecran est deja couvert par app_test.dart, et un
/// demarrage hors ligne noie le harnais sous les erreurs reseau.
const String itemId = String.fromEnvironment('E2E_ITEM_ID');

/// Port sur lequel personne n'ecoute : toute requete y est refusee.
const String deadApi = 'http://localhost:59999/api';

/// Etat d'un point de controle, lu a la source.
Future<bool?> serverChecked(String id) async {
  final client = HttpClient();
  try {
    final login = await client
        .postUrl(Uri.parse('http://localhost:3000/api/auth/login'));
    login.headers.contentType = ContentType.json;
    login.write(jsonEncode({
      'email': 'jean.dupont@neo-domotique.fr',
      'password': 'password123',
    }));
    final auth = jsonDecode(
        await (await login.close()).transform(utf8.decoder).join());
    final token = auth['accessToken'] as String;

    Future<dynamic> get(String path) async {
      final request =
          await client.getUrl(Uri.parse('http://localhost:3000/api$path'));
      request.headers.set('Authorization', 'Bearer $token');
      final response = await request.close();
      if (response.statusCode != 200) return null;
      final body = jsonDecode(await response.transform(utf8.decoder).join());
      return (body is Map && body['data'] != null) ? body['data'] : body;
    }

    for (final project
        in ((await get('/projets') as List<dynamic>?) ?? const [])
            .cast<Map<String, dynamic>>()) {
      final rooms =
          (await get('/projets/${project['id']}/pieces') as List<dynamic>?) ??
              const [];
      for (final room in rooms.cast<Map<String, dynamic>>()) {
        // La checklist n'est pas dans la liste des pieces : il faut le detail.
        final detail =
            await get('/pieces/${room['id']}') as Map<String, dynamic>?;
        final items = (detail?['checklist'] ?? detail?['checklistItems'] ?? [])
            as List<dynamic>;
        for (final item in items.cast<Map<String, dynamic>>()) {
          if (item['id'] == id) {
            return item['isChecked'] == true || item['checked'] == true;
          }
        }
      }
    }
    return null;
  } catch (_) {
    return null;
  } finally {
    client.close();
  }
}

/// Connecte la pile reelle de l'app : meme client HTTP, memes repositories.
Future<ProviderContainer> signedInStack() async {
  final container = ProviderContainer();
  final auth = container.read(authRepositoryProvider);
  // Le repository pose lui-meme le jeton sur le client HTTP.
  await auth.login(
    email: 'jean.dupont@neo-domotique.fr',
    password: 'password123',
  );
  return container;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('une saisie faite sans reseau arrive au bureau au retour',
      (tester) async {
    expect(itemId, isNotEmpty,
        reason: 'passer --dart-define=E2E_ITEM_ID=<id du point de controle>');

    await HiveStorage.init();
    final outbox = OutboxStoreImpl();
    for (final entry in await outbox.pending()) {
      await outbox.remove(entry.id); // on part d'une file propre
    }

    final etatInitial = await serverChecked(itemId);
    expect(etatInitial, isNotNull,
        reason: 'le point de controle doit exister cote serveur');
    final nouvelEtat = !etatInitial!;

    // --- Sur chantier, sans reseau -----------------------------------------
    final horsLigne = ProviderContainer(overrides: [
      apiClientProvider.overrideWithValue(
        ApiClient(dio: Dio(BaseOptions(baseUrl: deadApi))),
      ),
    ]);

    final result = await horsLigne
        .read(projectRepositoryProvider)
        .updateChecklistItem(itemId, {'checked': nouvelEtat});

    expect((result as Error<ChecklistItem>).failure, isA<OfflineQueuedFailure>(),
        reason: 'sans reseau, la saisie est mise en attente, pas jetee');

    final enAttente = await outbox.pending();
    expect(enAttente, hasLength(1));
    expect(enAttente.single.targetId, itemId);
    expect(enAttente.single.operation, OutboxOperation.checklistItemUpdate);

    // Le serveur, lui, n'a rien vu : la saisie n'est QUE locale.
    expect(await serverChecked(itemId), etatInitial);

    // --- De retour au bureau, le reseau revient ----------------------------
    final container = await signedInStack();
    final sender = OutboxSenderImpl(
      projects: container.read(projectRemoteDataSourceProvider),
      quotes: container.read(quoteRemoteDataSourceProvider),
    );

    final report = await OutboxReplay.drain(outbox, sender);

    expect(report.sent, 1, reason: 'la file doit se vider');
    expect(await outbox.pending(), isEmpty);

    expect(await serverChecked(itemId), nouvelEtat,
        reason: 'la saisie faite sans reseau doit etre arrivee au serveur : '
            'c est toute la promesse faite a l integrateur');
  });
}
