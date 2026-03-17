import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../errors/exceptions.dart';
import 'api_interceptors.dart';

/// HTTP API client using Dio
class ApiClient {
  final Dio _dio;
  final AuthInterceptor _authInterceptor;

  ApiClient({Dio? dio, AuthInterceptor? authInterceptor})
      : _authInterceptor = authInterceptor ?? AuthInterceptor(),
        _dio = dio ?? Dio(
          BaseOptions(
            baseUrl: EnvironmentConfig.baseUrl,
            connectTimeout: AppConfig.connectTimeout,
            receiveTimeout: AppConfig.receiveTimeout,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _dio.interceptors.addAll([
      _authInterceptor,
      LoggingInterceptor(),
      ErrorInterceptor(),
    ]);
  }

  /// Get the base URL
  String get baseUrl => _dio.options.baseUrl;

  /// Set the auth token for requests
  void setAuthToken(String token, {String? refreshToken}) {
    _authInterceptor.setTokens(accessToken: token, refreshToken: refreshToken);
  }

  /// Clear the auth token
  void clearAuthToken() {
    _authInterceptor.clearTokens();
  }

  /// GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Upload file with multipart form data
  Future<Response<T>> uploadFile<T>(
    String path, {
    required String filePath,
    required String fieldName,
    Map<String, dynamic>? additionalData,
    ProgressCallback? onSendProgress,
    CancelToken? cancelToken,
  }) async {
    try {
      final formData = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(filePath),
        ...?additionalData,
      });

      return await _dio.post<T>(
        path,
        data: formData,
        onSendProgress: onSendProgress,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  AppException _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkException(
          message: 'La connexion a expiré',
          code: 'TIMEOUT',
        );

      case DioExceptionType.connectionError:
        return const NetworkException(
          message: 'Impossible de se connecter au serveur',
          code: 'CONNECTION_ERROR',
        );

      case DioExceptionType.badResponse:
        return _handleBadResponse(error.response);

      case DioExceptionType.cancel:
        return const NetworkException(
          message: 'Requête annulée',
          code: 'CANCELLED',
        );

      default:
        return NetworkException(
          message: error.message ?? 'Erreur réseau inconnue',
          originalError: error,
        );
    }
  }

  AppException _handleBadResponse(Response? response) {
    final statusCode = response?.statusCode ?? 0;
    final data = response?.data;

    String message = 'Une erreur est survenue';
    String? code;

    if (data is Map<String, dynamic>) {
      // Backend format: { error: { message, code, details? } }
      final errorObj = data['error'];
      if (errorObj is Map<String, dynamic>) {
        message = errorObj['message'] as String? ?? message;
        code = errorObj['code'] as String?;
        // Zod validation details
        final details = errorObj['details'];
        if (details is List && details.isNotEmpty) {
          final issues = details
              .map((d) => d is Map ? (d['message'] ?? d.toString()) : d.toString())
              .join(', ');
          message = '$message: $issues';
        }
      }
      // Hono zValidator format: { success: false, error: { issues: [...] } }
      else if (data['success'] == false && data['error'] is Map) {
        final zodError = data['error'] as Map<String, dynamic>;
        final issues = zodError['issues'] as List<dynamic>?;
        if (issues != null && issues.isNotEmpty) {
          message = issues
              .map((i) => i is Map ? (i['message'] ?? '') : i.toString())
              .where((m) => m.toString().isNotEmpty)
              .join(', ');
          if (message.isEmpty) message = 'Données invalides';
        }
        code = 'VALIDATION_ERROR';
      }
      // Fallback: root-level message
      else {
        message = data['message'] as String? ?? message;
        code = data['code'] as String?;
      }
    }

    switch (statusCode) {
      case 400:
        return ValidationException(message: message, code: code);
      case 401:
        return const InvalidCredentialsException();
      case 403:
        return AuthException(message: message, code: 'FORBIDDEN');
      case 404:
        return NotFoundException(message: message);
      case 422:
        final errors = data is Map<String, dynamic>
            ? (data['errors'] as Map<String, dynamic>?)?.map(
                (key, value) => MapEntry(key, List<String>.from(value as List)),
              )
            : null;
        return ValidationException(
          message: message,
          code: code,
          fieldErrors: errors,
        );
      case >= 500:
        return ServerException(
          message: message,
          statusCode: statusCode,
        );
      default:
        return NetworkException(message: message, code: code);
    }
  }
}
