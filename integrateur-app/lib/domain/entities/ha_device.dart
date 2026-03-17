import 'package:equatable/equatable.dart';

class HaDevice extends Equatable {
  final String entityId;
  final String domain; // light, switch, climate, cover, alarm_control_panel, camera, sensor
  final String friendlyName;
  final String state; // on, off, unavailable, etc.
  final Map<String, dynamic> attributes;
  final DateTime lastChanged;

  const HaDevice({
    required this.entityId,
    required this.domain,
    required this.friendlyName,
    required this.state,
    this.attributes = const {},
    required this.lastChanged,
  });

  bool get isOn => state == 'on' || state == 'home' || state == 'armed_away';
  bool get isOff => state == 'off' || state == 'not_home' || state == 'disarmed';
  bool get isUnavailable => state == 'unavailable' || state == 'unknown';

  int? get brightness => attributes['brightness'] as int?;
  double? get temperature => (attributes['temperature'] as num?)?.toDouble();
  double? get currentTemperature =>
      (attributes['current_temperature'] as num?)?.toDouble();
  int? get currentPosition => attributes['current_position'] as int?;

  String get icon {
    switch (domain) {
      case 'light':
        return isOn ? '💡' : '🔅';
      case 'switch':
        return isOn ? '🔌' : '⭕';
      case 'climate':
        return '🌡️';
      case 'cover':
        return '🪟';
      case 'alarm_control_panel':
        return '🔒';
      case 'camera':
        return '📷';
      case 'sensor':
        return '📊';
      case 'binary_sensor':
        return '🔔';
      case 'media_player':
        return '🎵';
      default:
        return '⚡';
    }
  }

  @override
  List<Object?> get props => [entityId, state, attributes, lastChanged];
}
