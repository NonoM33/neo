import 'dart:developer' as developer;

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/appointment.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/appointment_repository.dart';
import '../datasources/remote/appointment_remote_datasource.dart';
import '../models/appointment_model.dart';

/// Implementation of AppointmentRepository
class AppointmentRepositoryImpl implements AppointmentRepository {
  final AppointmentRemoteDataSource _remoteDataSource;

  AppointmentRepositoryImpl({
    required AppointmentRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<Appointment>>> getAppointments({
    AppointmentFilter? filter,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (filter?.fromDate != null) {
        queryParams['fromDate'] = filter!.fromDate!.toIso8601String();
      }
      if (filter?.toDate != null) {
        queryParams['toDate'] = filter!.toDate!.toIso8601String();
      }
      if (filter?.type != null) {
        queryParams['type'] = filter!.type!.apiValue;
      }
      if (filter?.status != null) {
        queryParams['status'] = filter!.status!.apiValue;
      }
      if (filter?.userId != null) {
        queryParams['userId'] = filter!.userId;
      }
      if (filter?.clientId != null) {
        queryParams['clientId'] = filter!.clientId;
      }
      if (filter?.projectId != null) {
        queryParams['projectId'] = filter!.projectId;
      }

      final data = await _remoteDataSource.getAppointments(queryParams: queryParams);
      final appointmentsJson = data['data'] as List<dynamic>? ?? [];
      final appointments = appointmentsJson
          .map((json) => AppointmentModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return Success(appointments);
    } on NetworkException catch (e) {
      return Error(NetworkFailure(message: e.message));
    } catch (e, st) {
      developer.log('getAppointments error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getAppointments: $e', originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> getAppointment(String id) async {
    try {
      final appointment = await _remoteDataSource.getAppointment(id);
      return Success(appointment);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('getAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getAppointment: $e', originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> createAppointment({
    required String title,
    required AppointmentType type,
    required DateTime scheduledAt,
    required DateTime endAt,
    required int durationMinutes,
    LocationType locationType = LocationType.surSite,
    String? location,
    String? locationDetails,
    String? description,
    String? leadId,
    String? clientId,
    String? projectId,
    String? notes,
    List<String>? participantIds,
  }) async {
    try {
      final data = <String, dynamic>{
        'title': title,
        'type': type.apiValue,
        'scheduledAt': scheduledAt.toIso8601String(),
        'endAt': endAt.toIso8601String(),
        'durationMinutes': durationMinutes,
        'locationType': locationType.apiValue,
        if (location != null) 'location': location,
        if (locationDetails != null) 'locationDetails': locationDetails,
        if (description != null) 'description': description,
        if (leadId != null) 'leadId': leadId,
        if (clientId != null) 'clientId': clientId,
        if (projectId != null) 'projectId': projectId,
        if (notes != null) 'notes': notes,
        if (participantIds != null && participantIds.isNotEmpty)
          'participantIds': participantIds,
      };

      final appointment = await _remoteDataSource.createAppointment(data);
      return Success(appointment);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e, st) {
      developer.log('createAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> updateAppointment(String id, Map<String, dynamic> data) async {
    try {
      final appointment = await _remoteDataSource.updateAppointment(id, data);
      return Success(appointment);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('updateAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteAppointment(String id) async {
    try {
      await _remoteDataSource.deleteAppointment(id);
      return const Success(null);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('deleteAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> confirmAppointment(String id) async {
    try {
      final appointment = await _remoteDataSource.confirmAppointment(id);
      return Success(appointment);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('confirmAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> startAppointment(String id) async {
    try {
      final appointment = await _remoteDataSource.startAppointment(id);
      return Success(appointment);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('startAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> completeAppointment(
    String id, {
    String? outcome,
    int? actualDurationMinutes,
  }) async {
    try {
      final data = <String, dynamic>{
        if (outcome != null) 'outcome': outcome,
        if (actualDurationMinutes != null) 'actualDurationMinutes': actualDurationMinutes,
      };
      final appointment = await _remoteDataSource.completeAppointment(id, data);
      return Success(appointment);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('completeAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> cancelAppointment(String id, {String? reason}) async {
    try {
      final data = <String, dynamic>{
        if (reason != null) 'reason': reason,
      };
      final appointment = await _remoteDataSource.cancelAppointment(id, data);
      return Success(appointment);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('cancelAppointment error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Appointment>> markNoShow(String id) async {
    try {
      final appointment = await _remoteDataSource.markNoShow(id);
      return Success(appointment);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('markNoShow error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<AvailabilitySlot>>> getAvailability(String userId) async {
    try {
      final slots = await _remoteDataSource.getAvailability(userId);
      return Success(slots);
    } catch (e, st) {
      developer.log('getAvailability error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<AvailabilitySlot>>> setAvailability(
    String userId,
    List<AvailabilitySlot> slots,
  ) async {
    try {
      final slotsJson = slots
          .map((s) => {
                'dayOfWeek': s.dayOfWeek.apiValue,
                'startTime': s.startTime,
                'endTime': s.endTime,
                'isActive': s.isActive,
              })
          .toList();

      final result = await _remoteDataSource.setAvailability(userId, slotsJson);
      return Success(result);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e, st) {
      developer.log('setAvailability error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<Map<String, dynamic>>>> getAvailableSlots({
    required String userId,
    required DateTime fromDate,
    required DateTime toDate,
    required int durationMinutes,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'userId': userId,
        'fromDate': fromDate.toIso8601String(),
        'toDate': toDate.toIso8601String(),
        'durationMinutes': durationMinutes,
      };
      final slots = await _remoteDataSource.getAvailableSlots(queryParams);
      return Success(slots);
    } catch (e, st) {
      developer.log('getAvailableSlots error: $e', name: 'AppointmentRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(originalError: e));
    }
  }
}
