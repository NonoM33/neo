import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/validators.dart';
import '../../../routes/app_router.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';

/// Login screen - tablet split layout
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authBloc = ref.watch(authBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final isTablet = MediaQuery.sizeOf(context).width >= 600;

    return Scaffold(
      body: BlocListener<AuthBloc, AuthState>(
        bloc: authBloc,
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            context.goToDashboard();
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: colorScheme.error,
              ),
            );
          }
        },
        child: isTablet
            ? _buildTabletLayout(context, authBloc)
            : _buildMobileLayout(context, authBloc),
      ),
    );
  }

  /// Tablet: split layout with branding left, form right
  Widget _buildTabletLayout(BuildContext context, AuthBloc authBloc) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        // Left panel - branding
        Expanded(
          flex: 5,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  colorScheme.primary,
                  const Color(0xFF0D47A1), // Deeper blue
                ],
              ),
            ),
            child: Stack(
              children: [
                // Radial gradient overlay for depth
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        center: Alignment.topRight,
                        radius: 1.2,
                        colors: [
                          Colors.white.withAlpha(18),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                // Content
                SafeArea(
                  child: Padding(
                    padding: AppSpacing.pagePadding,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Spacer(flex: 3),
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(25),
                            borderRadius: AppRadius.borderRadiusXl,
                          ),
                          child: Icon(
                            Icons.home_work_rounded,
                            size: 64,
                            color: colorScheme.onPrimary,
                          ),
                        ),
                        AppSpacing.vGapXl,
                        Text(
                          'Neo\nIntegrateur',
                          style: textTheme.displaySmall?.copyWith(
                            color: colorScheme.onPrimary,
                            fontWeight: FontWeight.bold,
                            height: 1.1,
                          ),
                        ),
                        AppSpacing.vGapMd,
                        Text(
                          'Gerez vos projets domotique\nde l\'audit au devis.',
                          style: textTheme.bodyLarge?.copyWith(
                            color: colorScheme.onPrimary.withAlpha(200),
                            height: 1.5,
                          ),
                        ),
                        const Spacer(flex: 4),
                        Text(
                          'v1.0.0',
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onPrimary.withAlpha(100),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        // Right panel - form
        Expanded(
          flex: 5,
          child: Column(
            children: [
              // Top accent line
              Container(
                height: 4,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      colorScheme.primary,
                      colorScheme.primary.withAlpha(120),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: Container(
                  color: isDark ? colorScheme.surface : colorScheme.surfaceContainerLowest,
                  child: Center(
                    child: SingleChildScrollView(
                      padding: AppSpacing.pagePadding,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 480),
                        child: _buildForm(context, authBloc),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Mobile: single column centered
  Widget _buildMobileLayout(BuildContext context, AuthBloc authBloc) {
    return Center(
      child: SingleChildScrollView(
        padding: AppSpacing.pagePadding,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildMobileLogo(context),
              AppSpacing.vGapXl,
              _buildForm(context, authBloc),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMobileLogo(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer,
            borderRadius: AppRadius.borderRadiusXxl,
          ),
          child: Icon(
            Icons.home_work_rounded,
            size: 64,
            color: colorScheme.primary,
          ),
        ),
        AppSpacing.vGapLg,
        Text(
          'Neo Integrateur',
          style: textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        AppSpacing.vGapXs,
        Text(
          'Connectez-vous pour continuer',
          style: textTheme.bodyLarge?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildForm(BuildContext context, AuthBloc authBloc) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isTablet = MediaQuery.sizeOf(context).width >= 600;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (isTablet) ...[
          Text(
            'Connexion',
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          AppSpacing.vGapXs,
          Text(
            'Connectez-vous pour continuer',
            style: textTheme.bodyLarge?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.vGapXl,
        ],

        // Login form
        Form(
          key: _formKey,
          child: Column(
            children: [
              // Email field
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                validator: Validators.email,
              ),
              AppSpacing.vGapMd,

              // Password field
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.done,
                decoration: InputDecoration(
                  labelText: 'Mot de passe',
                  prefixIcon: const Icon(Icons.lock_outlined),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                    tooltip: _obscurePassword
                        ? 'Afficher le mot de passe'
                        : 'Masquer le mot de passe',
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                ),
                validator: (value) =>
                    Validators.password(value, minLength: 6),
                onFieldSubmitted: (_) => _submit(authBloc),
              ),
              AppSpacing.vGapLg,

              // Login button
              BlocBuilder<AuthBloc, AuthState>(
                bloc: authBloc,
                builder: (context, state) {
                  final isLoading = state is AuthLoading;

                  return SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: isLoading ? null : () => _submit(authBloc),
                      child: isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Se connecter'),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
        AppSpacing.vGapXl,

        // Demo hint
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest,
            borderRadius: AppRadius.borderRadiusMd,
          ),
          child: Row(
            children: [
              Icon(
                Icons.info_outline,
                color: colorScheme.primary,
              ),
              AppSpacing.hGapMd,
              Expanded(
                child: Text(
                  'Demo: utilisez admin@neo.fr / admin123',
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _submit(AuthBloc authBloc) {
    if (_formKey.currentState?.validate() ?? false) {
      authBloc.add(
        AuthLoginRequested(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        ),
      );
    }
  }
}
