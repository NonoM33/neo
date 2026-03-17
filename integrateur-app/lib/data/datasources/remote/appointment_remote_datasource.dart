import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/appointment_model.dart';

/// Remote data source for appointments
abstract class AppointmentRemoteDataSource {
  Future<Map<String, dynamic>> getAppointments({Map<String, dynamic>? queryParams});
  Future<AppointmentModel> getAppointment(String id);
  Future<AppointmentModel> createAppointment(Map<String, dynamic> data);
  Future<AppointmentModel> updateAppointment(String id, Map<String, dynamic> data);
  Future<void> deleteAppointment(String id);
  Future<AppointmentModel> confirmAppointment(String id);
  Future<AppointmentModel> startAppointment(String id);
  Future<AppointmentModel> completeAppointment(String id, Map<String, dynamic> data);
  Future<AppointmentModel> cancelAppointment(String id, Map<String, dynamic> data);
  Future<AppointmentModel> markNoShow(String id);
  Future<List<AvailabilitySlotModel>> getAvailability(String userId);
  Future<List<AvailabilitySlotModel>> setAvailability(String userId, List<Map<String, dynamic>> slots);
  Future<List<Map<String, dynamic>>> getAvailableSlots(Map<String, dynamic> queryParams);
}

/// Implementation of AppointmentRemoteDataSource
class AppointmentRemoteDataSourceImpl implements AppointmentRemoteDataSource {
  final ApiClient _apiClient;

  AppointmentRemoteDataSourceImpl(this._apiClient);

  @override
  Future<Map<String, dynamic>> getAppointments({Map<String, dynamic>? queryParams}) async {
    final response = await _apiClient.get(
      ApiEndpoints.appointments,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<AppointmentModel> getAppointment(String id) async {
    final response = await _apiClient.get(ApiEndpoints.appointment(id));
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AppointmentModel> createAppointment(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.appointments, data: data);
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AppointmentModel> updateAppointment(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.appointment(id), data: data);
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteAppointment(String id) async {
    await _apiClient.delete(ApiEndpoints.appointment(id));
  }

  @override
  Future<AppointmentModel> confirmAppointment(String id) async {
    final response = await _apiClient.put(
      ApiEndpoints.appointmentConfirm(id),
      data: {},
    );
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AppointmentModel> startAppointment(String id) async {
    final response = await _apiClient.put(
      ApiEndpoints.appointmentStart(id),
      data: {},
    );
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AppointmentModel> completeAppointment(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(
      ApiEndpoints.appointmentComplete(id),
      data: data,
    );
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AppointmentModel> cancelAppointment(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(
      ApiEndpoints.appointmentCancel(id),
      data: data,
    );
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AppointmentModel> markNoShow(String id) async {
    final response = await _apiClient.put(
      ApiEndpoints.appointmentNoShow(id),
      data: {},
    );
    return AppointmentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<List<AvailabilitySlotModel>> getAvailability(String userId) async {
    final response = await _apiClient.get(
      ApiEndpoints.userAvailability(userId),
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => AvailabilitySlotModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<AvailabilitySlotModel>> setAvailability(
    String userId,
    List<Map<String, dynamic>> slots,
  ) async {
    final response = await _apiClient.put(
      ApiEndpoints.userAvailability(userId),
      data: {'slots': slots},
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => AvailabilitySlotModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<Map<String, dynamic>>> getAvailableSlots(
    Map<String, dynamic> queryParams,
  ) async {
    final response = await _apiClient.get(
      ApiEndpoints.appointmentAvailableSlots,
      queryParameters: queryParams,
    );
    final list = response.data as List<dynamic>;
    return list.map((e) => e as Map<String, dynamic>).toList();
  }
}
