import '../../domain/entities/ha_device.dart';

class HaDeviceModel extends HaDevice {
  const HaDeviceModel({
    required super.entityId,
    required super.domain,
    required super.friendlyName,
    required super.state,
    super.attributes,
    required super.lastChanged,
  });

  factory HaDeviceModel.fromHaState(Map<String, dynamic> json) {
    final entityId = json['entity_id'] as String;
    final domain = entityId.split('.').first;
    final attributes =
        (json['attributes'] as Map<String, dynamic>?) ?? {};

    return HaDeviceModel(
      entityId: entityId,
      domain: domain,
      friendlyName:
          (attributes['friendly_name'] as String?) ?? entityId,
      state: (json['state'] as String?) ?? 'unknown',
      attributes: attributes,
      lastChanged: DateTime.tryParse(
              json['last_changed'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}
