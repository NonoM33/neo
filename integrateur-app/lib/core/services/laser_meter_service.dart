import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_blue_plus/flutter_blue_plus.dart';

/// Known BLE laser meter device names/prefixes
const _knownDeviceNames = [
  'DISTO', // Leica DISTO
  'Leica',
  'GLM', // Bosch GLM
  'Bosch',
  'PLR', // Bosch PLR
];

/// Status of the laser meter connection
enum LaserMeterStatus {
  disconnected,
  scanning,
  connecting,
  connected,
  measuring,
  error,
}

/// A detected laser meter device
class LaserMeterDevice {
  final BluetoothDevice device;
  final String name;
  final int rssi;

  const LaserMeterDevice({
    required this.device,
    required this.name,
    required this.rssi,
  });
}

/// Service to connect to BLE laser distance meters and read measurements
class LaserMeterService {
  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _measurementCharacteristic;

  final _statusController = StreamController<LaserMeterStatus>.broadcast();
  final _measurementController = StreamController<double>.broadcast();
  final _devicesController =
      StreamController<List<LaserMeterDevice>>.broadcast();

  Stream<LaserMeterStatus> get statusStream => _statusController.stream;
  Stream<double> get measurementStream => _measurementController.stream;
  Stream<List<LaserMeterDevice>> get devicesStream =>
      _devicesController.stream;

  LaserMeterStatus _status = LaserMeterStatus.disconnected;
  LaserMeterStatus get status => _status;

  final List<LaserMeterDevice> _foundDevices = [];
  StreamSubscription? _scanSubscription;
  StreamSubscription? _notifySubscription;

  /// Check if Bluetooth is available and on
  Future<bool> isAvailable() async {
    try {
      return await FlutterBluePlus.isSupported &&
          await FlutterBluePlus.adapterState.first ==
              BluetoothAdapterState.on;
    } catch (_) {
      return false;
    }
  }

  /// Start scanning for laser meter BLE devices
  Future<void> startScan() async {
    _setStatus(LaserMeterStatus.scanning);
    _foundDevices.clear();

    await _scanSubscription?.cancel();
    _scanSubscription = FlutterBluePlus.onScanResults.listen((results) {
      for (final result in results) {
        final name = result.device.platformName;
        if (name.isEmpty) continue;

        // Check if device name matches known laser meters
        final isLaserMeter = _knownDeviceNames.any(
            (prefix) => name.toUpperCase().contains(prefix.toUpperCase()));

        if (isLaserMeter) {
          final exists = _foundDevices.any(
              (d) => d.device.remoteId == result.device.remoteId);
          if (!exists) {
            _foundDevices.add(LaserMeterDevice(
              device: result.device,
              name: name,
              rssi: result.rssi,
            ));
            _devicesController.add(List.from(_foundDevices));
          }
        }
      }
    });

    await FlutterBluePlus.startScan(
      timeout: const Duration(seconds: 10),
      androidScanMode: AndroidScanMode.lowLatency,
    );

    // After timeout, stop scanning
    await Future.delayed(const Duration(seconds: 10));
    if (_status == LaserMeterStatus.scanning) {
      _setStatus(LaserMeterStatus.disconnected);
    }
  }

  /// Stop BLE scanning
  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
    await _scanSubscription?.cancel();
    _scanSubscription = null;
  }

  /// Connect to a specific laser meter device
  Future<bool> connect(LaserMeterDevice meterDevice) async {
    try {
      _setStatus(LaserMeterStatus.connecting);
      await stopScan();

      await meterDevice.device.connect(timeout: const Duration(seconds: 10));
      _connectedDevice = meterDevice.device;

      // Discover services and find measurement characteristic
      final services = await meterDevice.device.discoverServices();
      _measurementCharacteristic = _findMeasurementCharacteristic(services);

      if (_measurementCharacteristic != null) {
        // Subscribe to notifications for incoming measurements
        await _measurementCharacteristic!.setNotifyValue(true);
        _notifySubscription =
            _measurementCharacteristic!.onValueReceived.listen((value) {
          final distance = _parseMeasurement(value);
          if (distance != null && distance > 0) {
            _measurementController.add(distance);
          }
        });
      }

      _setStatus(LaserMeterStatus.connected);
      return true;
    } catch (_) {
      _setStatus(LaserMeterStatus.error);
      return false;
    }
  }

  /// Disconnect from the current device
  Future<void> disconnect() async {
    await _notifySubscription?.cancel();
    _notifySubscription = null;

    try {
      await _connectedDevice?.disconnect();
    } catch (_) {
      // Ignore disconnect errors
    }

    _connectedDevice = null;
    _measurementCharacteristic = null;
    _setStatus(LaserMeterStatus.disconnected);
  }

  /// Try to find the measurement characteristic from discovered services.
  /// Different laser meters use different UUIDs, so we try known ones.
  BluetoothCharacteristic? _findMeasurementCharacteristic(
      List<BluetoothService> services) {
    // Known measurement service/characteristic UUIDs for popular laser meters
    // Leica DISTO typically uses a custom BLE service
    // We look for characteristics with notify property (measurement data)
    for (final service in services) {
      for (final char in service.characteristics) {
        if (char.properties.notify || char.properties.indicate) {
          // Heuristic: measurement characteristics that send data
          return char;
        }
      }
    }
    return null;
  }

  /// Parse raw BLE bytes into a distance in meters.
  /// Format varies by manufacturer.
  double? _parseMeasurement(List<int> bytes) {
    if (bytes.isEmpty) return null;

    try {
      // Common format: distance as string in ASCII (e.g., "3.245")
      final text = String.fromCharCodes(bytes).trim();
      final numMatch = RegExp(r'[\d]+\.[\d]+').firstMatch(text);
      if (numMatch != null) {
        return double.tryParse(numMatch.group(0)!);
      }

      // Alternative: 4-byte IEEE 754 float (little-endian)
      if (bytes.length >= 4) {
        final bd = ByteData(4);
        for (var i = 0; i < 4; i++) {
          bd.setUint8(i, bytes[i]);
        }
        return bd.getFloat32(0, Endian.little);
      }
    } catch (_) {
      // Silent fail
    }

    return null;
  }

  void _setStatus(LaserMeterStatus newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
  }

  /// Clean up resources
  void dispose() {
    _scanSubscription?.cancel();
    _notifySubscription?.cancel();
    _statusController.close();
    _measurementController.close();
    _devicesController.close();
    disconnect();
  }
}
