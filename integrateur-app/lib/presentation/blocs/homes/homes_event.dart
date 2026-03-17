import 'package:equatable/equatable.dart';

sealed class HomesEvent extends Equatable {
  const HomesEvent();

  @override
  List<Object?> get props => [];
}

final class HomesConnectRequested extends HomesEvent {
  final String url;
  final String token;

  const HomesConnectRequested({
    required this.url,
    required this.token,
  });

  @override
  List<Object?> get props => [url, token];
}

final class HomesDisconnectRequested extends HomesEvent {
  const HomesDisconnectRequested();
}

final class HomesDevicesUpdated extends HomesEvent {
  final List<dynamic> devices;

  const HomesDevicesUpdated(this.devices);

  @override
  List<Object?> get props => [devices];
}

final class HomesToggleDevice extends HomesEvent {
  final String entityId;
  final String domain;
  final bool turnOn;

  const HomesToggleDevice({
    required this.entityId,
    required this.domain,
    required this.turnOn,
  });

  @override
  List<Object?> get props => [entityId, domain, turnOn];
}

final class HomesSetBrightness extends HomesEvent {
  final String entityId;
  final int brightness;

  const HomesSetBrightness({
    required this.entityId,
    required this.brightness,
  });

  @override
  List<Object?> get props => [entityId, brightness];
}

final class HomesSetTemperature extends HomesEvent {
  final String entityId;
  final double temperature;

  const HomesSetTemperature({
    required this.entityId,
    required this.temperature,
  });

  @override
  List<Object?> get props => [entityId, temperature];
}
