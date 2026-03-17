import 'package:equatable/equatable.dart';

import '../../../domain/entities/ha_device.dart';

sealed class HomesState extends Equatable {
  const HomesState();

  @override
  List<Object?> get props => [];
}

final class HomesInitial extends HomesState {
  const HomesInitial();
}

final class HomesConnecting extends HomesState {
  const HomesConnecting();
}

final class HomesConnected extends HomesState {
  final List<HaDevice> devices;
  final Map<String, List<HaDevice>> devicesByDomain;

  HomesConnected({required List<HaDevice> allDevices})
      : devices = allDevices,
        devicesByDomain = _groupByDomain(allDevices);

  static Map<String, List<HaDevice>> _groupByDomain(
      List<HaDevice> devices) {
    final map = <String, List<HaDevice>>{};
    for (final device in devices) {
      map.putIfAbsent(device.domain, () => []).add(device);
    }
    return map;
  }

  int get totalDevices => devices.length;
  int get onlineDevices =>
      devices.where((d) => !d.isUnavailable).length;
  int get activeDevices => devices.where((d) => d.isOn).length;

  @override
  List<Object?> get props => [devices];
}

final class HomesDisconnected extends HomesState {
  final String? reason;

  const HomesDisconnected({this.reason});

  @override
  List<Object?> get props => [reason];
}

final class HomesError extends HomesState {
  final String message;

  const HomesError(this.message);

  @override
  List<Object?> get props => [message];
}
