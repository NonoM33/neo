import 'dart:developer' as developer;
import 'package:dio/dio.dart';
import '../config/app_config.dart';

/// Interceptor for handling authentication tokens
class AuthInterceptor extends Interceptor {
  String? _accessToken;
  String? _refreshToken;

  void setTokens({required String accessToken, String? refreshToken}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  void clearTokens() {
    _accessToken = null;
    _refreshToken = null;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_accessToken != null) {
      options.headers['Authorization'] = 'Bearer $_accessToken';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && _refreshToken != null) {
      // Token expired, attempt refresh
      try {
        final newToken = await _refreshAccessToken();
        if (newToken != null) {
          _accessToken = newToken;

          // Retry the original request with new token
          final options = err.requestOptions;
          options.headers['Authorization'] = 'Bearer $newToken';

          final response = await Dio().fetch(options);
          return handler.resolve(response);
        }
      } catch (_) {
        // Refresh failed, clear tokens and propagate error
        clearTokens();
      }
    }
    handler.next(err);
  }

  Future<String?> _refreshAccessToken() async {
    try {
      final dio = Dio(BaseOptions(baseUrl: EnvironmentConfig.baseUrl));
      final response = await dio.post(
        '/auth/refresh',
        data: {'refresh_token': _refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        _refreshToken = data['refresh_token'] as String?;
        return data['access_token'] as String?;
      }
    } catch (_) {
      // Refresh failed
    }
    return null;
  }
}

/// Interceptor for logging requests and responses
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (EnvironmentConfig.isDebug) {
      developer.log(
        '→ ${options.method} ${options.uri}',
        name: 'API',
      );
      if (options.data != null) {
        developer.log(
          'Body: ${options.data}',
          name: 'API',
        );
      }
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (EnvironmentConfig.isDebug) {
      developer.log(
        '← ${response.statusCode} ${response.requestOptions.uri}',
        name: 'API',
      );
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (EnvironmentConfig.isDebug) {
      developer.log(
        '✗ ${err.response?.statusCode ?? 'ERR'} ${err.requestOptions.uri}',
        name: 'API',
        error: err.message,
      );
    }
    handler.next(err);
  }
}

/// Interceptor for global error handling
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Add request ID for tracking
    err.requestOptions.extra['requestId'] = DateTime.now().millisecondsSinceEpoch;
    handler.next(err);
  }
}
