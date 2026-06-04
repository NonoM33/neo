import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';

import '../config/app_config.dart';
import 'feedback_log_buffer.dart';

/// One reported feedback as returned by GET /feedback-api/mine.
class FeedbackItem {
  const FeedbackItem({
    required this.id,
    required this.title,
    required this.status,
    required this.kind,
    required this.severity,
    required this.createdAt,
    required this.comments,
  });

  final String id;
  final String title;
  final String status;
  final String kind;
  final String? severity;
  final String createdAt;
  final List<FeedbackComment> comments;

  factory FeedbackItem.fromJson(Map<String, dynamic> json) {
    final rawComments = (json['comments'] as List<dynamic>? ?? const []);
    return FeedbackItem(
      id: json['id'].toString(),
      title: (json['title'] ?? '').toString(),
      status: (json['status'] ?? 'nouveau').toString(),
      kind: (json['kind'] ?? 'bug').toString(),
      severity: json['severity']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      comments: rawComments
          .whereType<Map<String, dynamic>>()
          .map(FeedbackComment.fromJson)
          .toList(),
    );
  }
}

class FeedbackComment {
  const FeedbackComment({
    required this.author,
    required this.message,
    required this.createdAt,
  });

  final String author;
  final String message;
  final String createdAt;

  factory FeedbackComment.fromJson(Map<String, dynamic> json) {
    return FeedbackComment(
      author: (json['author'] ?? 'Équipe').toString(),
      message: (json['body'] ?? json['message'] ?? '').toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

/// Talks to the backend feedback widget API. Uses its own Dio instance (no auth
/// interceptor) since the endpoints are public and CORS-open.
class FeedbackService {
  FeedbackService._();
  static final FeedbackService instance = FeedbackService._();

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: '${EnvironmentConfig.baseHost}/feedback-api',
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  Map<String, dynamic> buildContext(String? route, Size? viewport) {
    return {
      'route': route,
      'platform': _platformLabel(),
      'language': 'fr-FR',
      'appVersion': AppConfig.appVersion,
      'viewport': viewport == null
          ? null
          : {'width': viewport.width.round(), 'height': viewport.height.round()},
      'capturedAt': DateTime.now().toIso8601String(),
      'logs': FeedbackLogBuffer.instance.logs,
    };
  }

  String _platformLabel() {
    try {
      return '${Platform.operatingSystem} ${Platform.operatingSystemVersion}';
    } catch (_) {
      return 'flutter';
    }
  }

  Future<String> submit({
    required String kind,
    required String title,
    required String description,
    String? severity,
    String? stepsToReproduce,
    String? expectedResult,
    String? reporterEmail,
    String? reporterName,
    required Map<String, dynamic> context,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/submit',
      data: {
        'app': 'flutter',
        'kind': kind,
        'title': title,
        'description': description,
        'severity': ?severity,
        if (stepsToReproduce != null && stepsToReproduce.isNotEmpty)
          'stepsToReproduce': stepsToReproduce,
        if (expectedResult != null && expectedResult.isNotEmpty)
          'expectedResult': expectedResult,
        if (reporterEmail != null && reporterEmail.isNotEmpty)
          'reporterEmail': reporterEmail,
        if (reporterName != null && reporterName.isNotEmpty)
          'reporterName': reporterName,
        'context': context,
      },
    );
    return (res.data?['id'] ?? '').toString();
  }

  Future<List<FeedbackItem>> fetchMine(String email) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/mine',
      queryParameters: {'email': email},
    );
    final items = (res.data?['items'] as List<dynamic>? ?? const []);
    return items
        .whereType<Map<String, dynamic>>()
        .map(FeedbackItem.fromJson)
        .toList();
  }
}
