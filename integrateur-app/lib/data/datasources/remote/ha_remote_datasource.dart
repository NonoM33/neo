import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../../models/ha_device_model.dart';

class HaRemoteDatasource {
  WebSocketChannel? _channel;
  final _devicesController =
      StreamController<List<HaDeviceModel>>.broadcast();
  final Map<String, HaDeviceModel> _devices = {};
  int _messageId = 1;
  final Map<int, Completer<dynamic>> _pendingRequests = {};
  bool _authenticated = false;
  String? _token;

  Stream<List<HaDeviceModel>> get devicesStream =>
      _devicesController.stream;
  List<HaDeviceModel> get currentDevices => _devices.values.toList();
  bool get isConnected => _authenticated;

  Future<void> connect(String url, String token) async {
    _token = token;

    final wsUrl = url.replaceFirst('http', 'ws');
    _channel =
        WebSocketChannel.connect(Uri.parse('$wsUrl/api/websocket'));

    _channel!.stream.listen(
      (data) => _handleMessage(
          jsonDecode(data as String) as Map<String, dynamic>),
      onError: (error) {
        _authenticated = false;
        _devicesController.addError(error);
      },
      onDone: () {
        _authenticated = false;
      },
    );
  }

  void _handleMessage(Map<String, dynamic> message) {
    final type = message['type'] as String?;

    switch (type) {
      case 'auth_required':
        _sendRaw({'type': 'auth', 'access_token': _token});
        break;

      case 'auth_ok':
        _authenticated = true;
        _fetchStates();
        _subscribeEvents();
        break;

      case 'auth_invalid':
        _authenticated = false;
        _devicesController
            .addError(Exception('Authentication failed'));
        break;

      case 'result':
        final id = message['id'] as int?;
        if (id != null && _pendingRequests.containsKey(id)) {
          if (message['success'] == true) {
            _pendingRequests[id]!.complete(message['result']);
          } else {
            _pendingRequests[id]!.completeError(
              Exception(message['error']?['message'] ??
                  'Unknown error'),
            );
          }
          _pendingRequests.remove(id);
        }

        // Handle get_states result
        if (message['success'] == true &&
            message['result'] is List) {
          final states = message['result'] as List;
          for (final state in states) {
            if (state is Map<String, dynamic>) {
              final device = HaDeviceModel.fromHaState(state);
              if (_isControllableDevice(device.domain)) {
                _devices[device.entityId] = device;
              }
            }
          }
          _devicesController.add(_devices.values.toList());
        }
        break;

      case 'event':
        final eventData =
            message['event'] as Map<String, dynamic>?;
        if (eventData?['event_type'] == 'state_changed') {
          final newState = eventData?['data']?['new_state']
              as Map<String, dynamic>?;
          if (newState != null) {
            final device = HaDeviceModel.fromHaState(newState);
            if (_isControllableDevice(device.domain)) {
              _devices[device.entityId] = device;
              _devicesController.add(_devices.values.toList());
            }
          }
        }
        break;
    }
  }

  bool _isControllableDevice(String domain) {
    return [
      'light',
      'switch',
      'climate',
      'cover',
      'alarm_control_panel',
      'camera',
      'sensor',
      'binary_sensor',
      'media_player',
      'fan',
      'lock',
      'scene',
    ].contains(domain);
  }

  Future<void> _fetchStates() async {
    _sendCommand({'type': 'get_states'});
  }

  Future<void> _subscribeEvents() async {
    _sendCommand({
      'type': 'subscribe_events',
      'event_type': 'state_changed',
    });
  }

  Future<dynamic> callService(
    String domain,
    String service, {
    Map<String, dynamic>? data,
    String? entityId,
  }) {
    final serviceData = <String, dynamic>{
      'type': 'call_service',
      'domain': domain,
      'service': service,
    };
    if (entityId != null) {
      serviceData['target'] = {'entity_id': entityId};
    }
    if (data != null) {
      serviceData['service_data'] = data;
    }
    return _sendCommand(serviceData);
  }

  Future<dynamic> _sendCommand(Map<String, dynamic> command) {
    final id = _messageId++;
    command['id'] = id;
    final completer = Completer<dynamic>();
    _pendingRequests[id] = completer;
    _sendRaw(command);
    return completer.future;
  }

  void _sendRaw(Map<String, dynamic> data) {
    _channel?.sink.add(jsonEncode(data));
  }

  Future<void> disconnect() async {
    await _channel?.sink.close();
    _channel = null;
    _authenticated = false;
    _devices.clear();
    _pendingRequests.clear();
  }

  void dispose() {
    disconnect();
    _devicesController.close();
  }
}
