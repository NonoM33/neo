import '../../domain/entities/device.dart';

/// Device model - matches backend devices table
class DeviceModel extends Device {
  const DeviceModel({
    required super.id,
    required super.roomId,
    super.productId,
    required super.name,
    super.serialNumber,
    super.macAddress,
    super.ipAddress,
    super.status,
    super.location,
    super.notes,
    super.isOnline,
    super.lastSeenAt,
    super.installedAt,
    required super.createdAt,
    super.updatedAt,
  });

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['id'] as String,
      roomId: json['roomId'] as String? ?? '',
      productId: json['productId'] as String?,
      name: json['name'] as String? ?? '',
      serialNumber: json['serialNumber'] as String?,
      macAddress: json['macAddress'] as String?,
      ipAddress: json['ipAddress'] as String?,
      status: DeviceStatus.fromString(json['status'] as String? ?? 'planifie'),
      location: json['location'] as String?,
      notes: json['notes'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
      lastSeenAt: json['lastSeenAt'] != null
          ? DateTime.parse(json['lastSeenAt'] as String)
          : null,
      installedAt: json['installedAt'] != null
          ? DateTime.parse(json['installedAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  /// For create request
  Map<String, dynamic> toCreateJson() {
    return {
      if (productId != null) 'productId': productId,
      'name': name,
      if (serialNumber != null) 'serialNumber': serialNumber,
      if (macAddress != null) 'macAddress': macAddress,
      if (ipAddress != null) 'ipAddress': ipAddress,
      'status': status.apiValue,
      if (location != null) 'location': location,
      if (notes != null) 'notes': notes,
    };
  }

  /// For update request
  Map<String, dynamic> toUpdateJson() {
    return {
      'name': name,
      if (productId != null) 'productId': productId,
      if (serialNumber != null) 'serialNumber': serialNumber,
      if (macAddress != null) 'macAddress': macAddress,
      if (ipAddress != null) 'ipAddress': ipAddress,
      'status': status.apiValue,
      if (location != null) 'location': location,
      'notes': notes,
      'isOnline': isOnline,
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomId': roomId,
      ...toCreateJson(),
      'isOnline': isOnline,
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  factory DeviceModel.fromEntity(Device device) {
    return DeviceModel(
      id: device.id,
      roomId: device.roomId,
      productId: device.productId,
      name: device.name,
      serialNumber: device.serialNumber,
      macAddress: device.macAddress,
      ipAddress: device.ipAddress,
      status: device.status,
      location: device.location,
      notes: device.notes,
      isOnline: device.isOnline,
      lastSeenAt: device.lastSeenAt,
      installedAt: device.installedAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    );
  }
}
