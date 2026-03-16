import 'package:hive_flutter/hive_flutter.dart';
import '../config/app_config.dart';

/// Hive local storage service
class HiveStorage {
  static bool _initialized = false;

  /// Initialize Hive
  static Future<void> init() async {
    if (_initialized) return;

    await Hive.initFlutter();

    // Register adapters will be called here after code generation
    // Example: Hive.registerAdapter(ProjectModelAdapter());

    _initialized = true;
  }

  /// Open a box for general caching
  static Future<Box<T>> openBox<T>(String name) async {
    if (!Hive.isBoxOpen(name)) {
      return await Hive.openBox<T>(name);
    }
    return Hive.box<T>(name);
  }

  /// Get the main cache box
  static Future<Box<dynamic>> getCacheBox() async {
    return openBox(AppConfig.hiveBoxName);
  }

  /// Get the auth box
  static Future<Box<dynamic>> getAuthBox() async {
    return openBox(AppConfig.authBoxName);
  }

  /// Get the sync box
  static Future<Box<dynamic>> getSyncBox() async {
    return openBox(AppConfig.syncBoxName);
  }

  /// Close all boxes
  static Future<void> closeAll() async {
    await Hive.close();
    _initialized = false;
  }

  /// Clear all data
  static Future<void> clearAll() async {
    await Hive.deleteFromDisk();
    _initialized = false;
    await init();
  }
}

/// Generic cache operations
class CacheService {
  final Box _box;

  CacheService(this._box);

  /// Store a value with optional expiration
  Future<void> put<T>(
    String key,
    T value, {
    Duration? expiration,
  }) async {
    final entry = CacheEntry<T>(
      value: value,
      timestamp: DateTime.now(),
      expiration: expiration,
    );
    await _box.put(key, entry.toMap());
  }

  /// Get a cached value, returns null if expired or not found
  T? get<T>(String key) {
    final data = _box.get(key);
    if (data == null) return null;

    final entry = CacheEntry<T>.fromMap(data as Map);
    if (entry.isExpired) {
      _box.delete(key);
      return null;
    }

    return entry.value;
  }

  /// Check if a key exists and is not expired
  bool has(String key) {
    return get(key) != null;
  }

  /// Delete a cached value
  Future<void> delete(String key) async {
    await _box.delete(key);
  }

  /// Clear all cached values
  Future<void> clear() async {
    await _box.clear();
  }
}

/// Cache entry with expiration support
class CacheEntry<T> {
  final T value;
  final DateTime timestamp;
  final Duration? expiration;

  CacheEntry({
    required this.value,
    required this.timestamp,
    this.expiration,
  });

  bool get isExpired {
    if (expiration == null) return false;
    return DateTime.now().isAfter(timestamp.add(expiration!));
  }

  Map<String, dynamic> toMap() {
    return {
      'value': value,
      'timestamp': timestamp.toIso8601String(),
      'expiration': expiration?.inMilliseconds,
    };
  }

  factory CacheEntry.fromMap(Map map) {
    return CacheEntry(
      value: map['value'] as T,
      timestamp: DateTime.parse(map['timestamp'] as String),
      expiration: map['expiration'] != null
          ? Duration(milliseconds: map['expiration'] as int)
          : null,
    );
  }
}
