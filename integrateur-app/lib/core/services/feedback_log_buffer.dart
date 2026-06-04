import 'package:flutter/foundation.dart';

/// In-memory ring buffer of recent log lines, attached to feedback so the team
/// can diagnose an issue without a back-and-forth. Hooked into [debugPrint] in
/// main(): every log line is mirrored here (capped) and still printed.
class FeedbackLogBuffer {
  FeedbackLogBuffer._();
  static final FeedbackLogBuffer instance = FeedbackLogBuffer._();

  static const int _maxLines = 40;
  final List<Map<String, String>> _logs = [];

  List<Map<String, String>> get logs => List.unmodifiable(_logs);

  void add(String level, String message) {
    _logs.add({
      'level': level,
      'message': message.length > 1000 ? message.substring(0, 1000) : message,
      'at': DateTime.now().toIso8601String(),
    });
    if (_logs.length > _maxLines) _logs.removeAt(0);
  }

  /// Installs the debugPrint hook. Idempotent.
  static bool _installed = false;
  static void install() {
    if (_installed) return;
    _installed = true;
    final original = debugPrint;
    debugPrint = (String? message, {int? wrapWidth}) {
      if (message != null) instance.add('log', message);
      original(message, wrapWidth: wrapWidth);
    };
    FlutterError.onError = (FlutterErrorDetails details) {
      instance.add('error', details.exceptionAsString());
      FlutterError.presentError(details);
    };
  }
}
