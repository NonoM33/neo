import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/app_config.dart';
import 'core/di/providers.dart';
import 'core/theme/app_theme.dart';
import 'presentation/blocs/auth/auth_event.dart';
import 'presentation/blocs/sync/sync_bloc.dart';
import 'routes/app_router.dart';

/// Main application widget
class NeoIntegrateurApp extends ConsumerStatefulWidget {
  const NeoIntegrateurApp({super.key});

  @override
  ConsumerState<NeoIntegrateurApp> createState() => _NeoIntegrateurAppState();
}

class _NeoIntegrateurAppState extends ConsumerState<NeoIntegrateurApp> {
  @override
  void initState() {
    super.initState();
    // Check auth status on app start
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authBlocProvider).add(const AuthCheckRequested());
      ref.read(syncBlocProvider).add(const SyncStarted());
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,

      // Theme
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,

      // Router
      routerConfig: router,

      // Localization
      locale: const Locale('fr', 'FR'),
      supportedLocales: const [
        Locale('fr', 'FR'),
        Locale('en', 'US'),
      ],

      // Builder for global UI modifications
      builder: (context, child) {
        return MediaQuery(
          // Prevent text scaling from being too large
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.of(context).textScaler.scale(1.0).clamp(0.8, 1.2),
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
