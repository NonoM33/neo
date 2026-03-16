/// API endpoints constants
class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';
  static const String me = '/auth/me';

  // Projects
  static const String projects = '/projets';
  static String project(String id) => '/projets/$id';

  // Rooms (Pieces)
  static String projectRooms(String projectId) => '/projets/$projectId/pieces';
  static String room(String id) => '/pieces/$id';

  // Photos
  static String roomPhotos(String roomId) => '/pieces/$roomId/photos';
  static String photo(String id) => '/photos/$id';

  // Catalogue
  static const String products = '/produits';
  static String product(String id) => '/produits/$id';
  static const String categories = '/produits/categories';
  static const String brands = '/produits/marques';

  // Quotes (Devis)
  static String projectQuotes(String projectId) => '/projets/$projectId/devis';
  static String quote(String id) => '/devis/$id';
  static String quotePdf(String id) => '/devis/$id/pdf';
  static String sendQuote(String id) => '/devis/$id/envoyer';

  // Sync
  static const String syncStatus = '/sync/status';
  static const String syncPull = '/sync/pull';
  static const String syncPush = '/sync/push';

  ApiEndpoints._();
}
