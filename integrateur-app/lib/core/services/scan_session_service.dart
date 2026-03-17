import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../data/models/floor_plan_model.dart';
import '../../domain/entities/floor_plan.dart';
import '../config/app_config.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';

const _uuid = Uuid();

/// Status of a scan session
enum ScanSessionStatus {
  pending, // waiting for iPhone to scan
  scanning, // iPhone is scanning
  completed, // scan data uploaded
  expired, // session timed out
  error,
}

/// A cross-device scan session
class ScanSession {
  final String id;
  final String roomId;
  final String projectId;
  final String roomName;
  final ScanSessionStatus status;
  final FloorPlan? result;
  final DateTime createdAt;

  const ScanSession({
    required this.id,
    required this.roomId,
    required this.projectId,
    this.roomName = '',
    this.status = ScanSessionStatus.pending,
    this.result,
    required this.createdAt,
  });

  /// URL the iPhone should open (web page on the backend)
  String get scanUrl => '${EnvironmentConfig.baseHost}/scan/$id';

  /// Deep link for the Neo app on iPhone (if installed)
  String get deepLink =>
      'neo://scan?session=$id&room=$roomId&project=$projectId&name=${Uri.encodeComponent(roomName)}';

  bool get isExpired =>
      DateTime.now().difference(createdAt) > const Duration(minutes: 10);
}

/// Service to manage cross-device LiDAR scan sessions.
///
/// Flow:
/// 1. iPad: createSession() → gets session ID → shows QR code
/// 2. iPhone: scans QR → opens app with session ID → runs LiDAR scan
/// 3. iPhone: uploadResult() → sends FloorPlan JSON to backend
/// 4. iPad: pollForResult() → periodically checks backend until result arrives
class ScanSessionService {
  final ApiClient _apiClient;
  Timer? _pollTimer;
  final _resultController = StreamController<FloorPlan>.broadcast();

  Stream<FloorPlan> get resultStream => _resultController.stream;

  ScanSessionService(this._apiClient);

  /// Create a new scan session on the backend
  Future<ScanSession> createSession({
    required String roomId,
    required String projectId,
    String roomName = '',
  }) async {
    final sessionId = _uuid.v4();

    try {
      await _apiClient.post(
        ApiEndpoints.scanSessions,
        data: {
          'id': sessionId,
          'roomId': roomId,
          'projectId': projectId,
          'roomName': roomName,
        },
      );
    } catch (_) {
      // If backend doesn't support scan sessions yet, create locally
    }

    return ScanSession(
      id: sessionId,
      roomId: roomId,
      projectId: projectId,
      roomName: roomName,
      createdAt: DateTime.now(),
    );
  }

  /// Upload scan result from the iPhone side
  Future<bool> uploadResult(String sessionId, FloorPlan plan) async {
    try {
      final planJson = FloorPlanModel.fromEntity(plan).toJson();
      await _apiClient.put(
        ApiEndpoints.scanSessionResult(sessionId),
        data: {'plan': planJson},
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Start polling the backend for scan results (iPad side)
  void startPolling(String sessionId, {
    required String roomId,
    required String projectId,
  }) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      try {
        final response = await _apiClient.get(
          ApiEndpoints.scanSession(sessionId),
        );
        final data = response.data as Map<String, dynamic>;
        final status = data['status'] as String?;

        if (status == 'completed' && data['plan'] != null) {
          final planData = data['plan'] as Map<String, dynamic>;
          final plan = FloorPlanModel.fromJson(planData);
          _resultController.add(plan);
          stopPolling();
        }
      } catch (_) {
        // Continue polling silently
      }
    });

    // Auto-stop after 10 minutes
    Future.delayed(const Duration(minutes: 10), () {
      stopPolling();
    });
  }

  /// Stop polling
  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  void dispose() {
    stopPolling();
    _resultController.close();
  }
}
