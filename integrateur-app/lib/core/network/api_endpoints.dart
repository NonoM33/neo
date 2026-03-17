/// API endpoints constants - matches backend routes under /api prefix
class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';
  static const String me = '/auth/me';

  // Clients (under /projets prefix)
  static const String clients = '/projets/clients';
  static String client(String id) => '/projets/clients/$id';

  // Projects
  static const String projects = '/projets';
  static String project(String id) => '/projets/$id';

  // Rooms (Pieces)
  static String projectRooms(String projectId) => '/projets/$projectId/pieces';
  static String room(String id) => '/pieces/$id';

  // Checklist Items
  static String roomChecklist(String roomId) => '/pieces/$roomId/checklist';
  static String checklistItem(String id) => '/checklist/$id';

  // Photos
  static String roomPhotos(String roomId) => '/pieces/$roomId/photos';
  static String photo(String id) => '/photos/$id';

  // Devices
  static String projectDevices(String projectId) => '/projets/$projectId/devices';
  static String roomDevices(String roomId) => '/pieces/$roomId/devices';
  static String device(String id) => '/devices/$id';

  // Products (Catalogue)
  static const String products = '/produits';
  static String product(String id) => '/produits/$id';
  static const String categories = '/produits/categories';
  static const String brands = '/produits/marques';
  static const String productsImport = '/produits/import';
  static String productDependencies(String id) => '/produits/$id/dependances';

  // Quotes (Devis)
  static String projectQuotes(String projectId) => '/projets/$projectId/devis';
  static String quote(String id) => '/devis/$id';
  static String quotePdf(String id) => '/devis/$id/pdf';
  static String sendQuote(String id) => '/devis/$id/envoyer';

  // Sync
  static const String syncStatus = '/sync/status';
  static const String syncPull = '/sync/pull';
  static const String syncPush = '/sync/push';

  // Users (admin only)
  static const String users = '/users';
  static String user(String id) => '/users/$id';

  // Appointments
  static const String appointments = '/appointments';
  static const String appointmentAvailableSlots = '/appointments/available-slots';
  static String appointment(String id) => '/appointments/$id';
  static String appointmentConfirm(String id) => '/appointments/$id/confirm';
  static String appointmentStart(String id) => '/appointments/$id/start';
  static String appointmentComplete(String id) => '/appointments/$id/complete';
  static String appointmentCancel(String id) => '/appointments/$id/cancel';
  static String appointmentNoShow(String id) => '/appointments/$id/no-show';
  static String appointmentParticipants(String id) => '/appointments/$id/participants';
  static const String appointmentTypes = '/appointments/types';
  static String userAvailability(String userId) => '/availability/$userId';
  static String userAvailableSlots(String userId) => '/availability/$userId/slots';
  static const String availabilityOverrides = '/availability/overrides';

  // Tickets (Support)
  static const String tickets = '/tickets';
  static const String ticketStats = '/tickets/stats';
  static String ticket(String id) => '/tickets/$id';
  static String ticketStatus(String id) => '/tickets/$id/status';
  static String ticketAssign(String id) => '/tickets/$id/assign';
  static String ticketEscalate(String id) => '/tickets/$id/escalate';
  static String ticketComments(String id) => '/tickets/$id/comments';
  static String ticketHistory(String id) => '/tickets/$id/history';
  static const String ticketCategories = '/tickets/categories';
  static const String ticketSla = '/tickets/sla';
  static const String ticketCannedResponses = '/tickets/canned-responses';

  // Scan Sessions (LiDAR cross-device)
  static const String scanSessions = '/scan-sessions';
  static String scanSession(String id) => '/scan-sessions/$id';
  static String scanSessionResult(String id) => '/scan-sessions/$id/result';

  ApiEndpoints._();
}
