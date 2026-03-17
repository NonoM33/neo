import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/datasources/remote/ha_remote_datasource.dart';
import '../../../data/models/ha_device_model.dart';
import 'homes_event.dart';
import 'homes_state.dart';

class HomesBloc extends Bloc<HomesEvent, HomesState> {
  final HaRemoteDatasource _haRemote;
  StreamSubscription? _devicesSubscription;

  HomesBloc({required HaRemoteDatasource haRemote})
      : _haRemote = haRemote,
        super(const HomesInitial()) {
    on<HomesConnectRequested>(_onConnect);
    on<HomesDisconnectRequested>(_onDisconnect);
    on<HomesDevicesUpdated>(_onDevicesUpdated);
    on<HomesToggleDevice>(_onToggleDevice);
    on<HomesSetBrightness>(_onSetBrightness);
    on<HomesSetTemperature>(_onSetTemperature);
  }

  Future<void> _onConnect(
    HomesConnectRequested event,
    Emitter<HomesState> emit,
  ) async {
    emit(const HomesConnecting());

    try {
      await _haRemote.connect(event.url, event.token);

      _devicesSubscription?.cancel();
      _devicesSubscription = _haRemote.devicesStream.listen(
        (devices) => add(HomesDevicesUpdated(devices)),
        onError: (error) =>
            add(const HomesDisconnectRequested()),
      );
    } catch (e) {
      emit(HomesError(e.toString()));
    }
  }

  Future<void> _onDisconnect(
    HomesDisconnectRequested event,
    Emitter<HomesState> emit,
  ) async {
    _devicesSubscription?.cancel();
    await _haRemote.disconnect();
    emit(const HomesDisconnected());
  }

  void _onDevicesUpdated(
    HomesDevicesUpdated event,
    Emitter<HomesState> emit,
  ) {
    final devices = event.devices.cast<HaDeviceModel>();
    emit(HomesConnected(allDevices: devices));
  }

  Future<void> _onToggleDevice(
    HomesToggleDevice event,
    Emitter<HomesState> emit,
  ) async {
    final service = event.turnOn ? 'turn_on' : 'turn_off';
    await _haRemote.callService(
      event.domain,
      service,
      entityId: event.entityId,
    );
  }

  Future<void> _onSetBrightness(
    HomesSetBrightness event,
    Emitter<HomesState> emit,
  ) async {
    await _haRemote.callService(
      'light',
      'turn_on',
      entityId: event.entityId,
      data: {'brightness': event.brightness},
    );
  }

  Future<void> _onSetTemperature(
    HomesSetTemperature event,
    Emitter<HomesState> emit,
  ) async {
    await _haRemote.callService(
      'climate',
      'set_temperature',
      entityId: event.entityId,
      data: {'temperature': event.temperature},
    );
  }

  @override
  Future<void> close() {
    _devicesSubscription?.cancel();
    _haRemote.dispose();
    return super.close();
  }
}
