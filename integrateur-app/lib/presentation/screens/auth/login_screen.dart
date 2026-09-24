import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../routes/app_router.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../widgets/ds/ds.dart';
import '../../widgets/feedback/feedback_overlay.dart';

/// Connexion.
///
/// iPad paysage : split-screen — panneau de marque a gauche, formulaire a
/// droite (440–480 pt). iPad portrait : formulaire centre. iPhone : plein
/// ecran, action collee au clavier.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  /// Le bouton ne tourne que si **cet ecran** a soumis quelque chose.
  /// `AuthLoading` est aussi emis par la verification de session au demarrage :
  /// s'y fier afficherait un bouton bloque en chargement sans action de l'utilisateur.
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit(AuthBloc bloc) {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    bloc.add(
      AuthLoginRequested(
        email: _email.text.trim(),
        password: _password.text,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(authBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;
    final split = device.isTabletOrLarger && context.dsIsLandscape;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<AuthBloc, AuthState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            setState(() => _submitting = false);
            context.goToDashboard();
          }
          if (state is AuthError) {
            setState(() => _submitting = false);
            showDsSnackbar(context, message: state.message, tone: DsTone.error);
          }
        },
        builder: (context, state) {
          final form = _Form(
            formKey: _formKey,
            email: _email,
            password: _password,
            obscure: _obscure,
            loading: _submitting && state is AuthLoading,
            error: state is AuthError ? state.message : null,
            onToggleObscure: () => setState(() => _obscure = !_obscure),
            onSubmit: () => _submit(bloc),
            onQuickLogin: (email, password) {
              _email.text = email;
              _password.text = password;
              _submit(bloc);
            },
          );

          if (!split) {
            return SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(DsSpacing.pagePadding(device)),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const _Brand(compact: true),
                        const SizedBox(height: DsSpacing.gapSection),
                        form,
                      ],
                    ),
                  ),
                ),
              ),
            );
          }

          return Row(
            children: [
              const Expanded(flex: 5, child: _Brand()),
              Expanded(
                flex: 4,
                child: SafeArea(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(DsSpacing.s8),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 460),
                        child: form,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Panneau de marque. Aucun logo n'a ete fourni : le nom est compose en type,
/// avec le monogramme sur le gradient de marque.
class _Brand extends StatelessWidget {
  const _Brand({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    final mark = Container(
      width: compact ? 64 : 88,
      height: compact ? 64 : 88,
      decoration: BoxDecoration(
        gradient: ds.gradientBrand,
        borderRadius: BorderRadius.circular(compact ? 16 : 22),
      ),
      alignment: Alignment.center,
      child: Text(
        'NI',
        style: TextStyle(
          fontSize: compact ? 24 : 34,
          fontWeight: DsWeight.semibold,
          letterSpacing: 0.5,
          color: Colors.white,
        ),
      ),
    );

    if (compact) return mark;

    return Container(
      decoration: BoxDecoration(gradient: ds.gradientBrand),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DsSpacing.s16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              mark,
              const SizedBox(height: DsSpacing.s8),
              Text(
                'Neo Intégrateur',
                style: TextStyle(
                  fontSize: t.displaySize,
                  height: t.displayLine / t.displaySize,
                  fontWeight: DsWeight.light,
                  letterSpacing: t.displayLs,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: DsSpacing.s4),
              Text(
                'Arriver chez le client les mains vides,\net repartir avec un devis signé.',
                style: TextStyle(
                  fontSize: t.bodyLgSize,
                  height: t.bodyLgLine / t.bodyLgSize,
                  color: Colors.white.withAlpha(220),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Form extends StatelessWidget {
  const _Form({
    required this.formKey,
    required this.email,
    required this.password,
    required this.obscure,
    required this.loading,
    required this.error,
    required this.onToggleObscure,
    required this.onSubmit,
    required this.onQuickLogin,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController email;
  final TextEditingController password;
  final bool obscure;
  final bool loading;
  final String? error;
  final VoidCallback onToggleObscure;
  final VoidCallback onSubmit;
  final void Function(String email, String password) onQuickLogin;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return Form(
      key: formKey,
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Connexion',
              style: TextStyle(
                fontSize: t.h1Size,
                fontWeight: DsWeight.semibold,
                letterSpacing: -0.5,
                color: ds.textPrimary,
              ),
            ),
            const SizedBox(height: DsSpacing.s2),
            Text(
              'Vos audits en cours restent enregistrés sur cet appareil.',
              style: TextStyle(
                fontSize: t.bodySize,
                color: ds.textSecondary,
              ),
            ),
            const SizedBox(height: DsSpacing.gapSection),
            if (error != null) ...[
              DsErrorState(
                kind: DsErrorKind.fromMessage(error),
                inline: true,
                title: 'Connexion impossible',
                description: error,
              ),
              const SizedBox(height: DsSpacing.s4),
            ],
            DsTextField(
              label: 'Email',
              controller: email,
              keyboardType: TextInputType.emailAddress,
              prefixIcon: DsGlyph.mail,
              required: true,
              autofillHints: const [AutofillHints.username],
              validator: (value) => (value == null || !value.contains('@'))
                  ? 'Saisissez une adresse email valide'
                  : null,
            ),
            const SizedBox(height: DsSpacing.s4),
            DsTextField(
              label: 'Mot de passe',
              controller: password,
              obscureText: obscure,
              prefixIcon: Icons.lock_outline_rounded,
              required: true,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.password],
              onSubmitted: (_) => onSubmit(),
              validator: (value) => (value == null || value.isEmpty)
                  ? 'Saisissez votre mot de passe'
                  : null,
              suffix: DsIconButton(
                icon: obscure ? DsGlyph.visibility : DsGlyph.visibilityOff,
                label: obscure
                    ? 'Afficher le mot de passe'
                    : 'Masquer le mot de passe',
                onPressed: onToggleObscure,
              ),
            ),
            const SizedBox(height: DsSpacing.s6),
            DsButton(
              label: 'Se connecter',
              icon: Icons.login_rounded,
              size: DsButtonSize.large,
              fullWidth: true,
              loading: loading,
              onPressed: onSubmit,
            ),
            // Les raccourcis de recette n'existent jamais en production.
            if (!kReleaseMode) ...[
              const SizedBox(height: DsSpacing.gapSection),
              const DsSectionTitle('Connexion rapide (recette)'),
              const SizedBox(height: DsSpacing.s2),
              Wrap(
                spacing: DsSpacing.s2,
                runSpacing: DsSpacing.s2,
                children: [
                  // Comptes crees par `bun run db:seed` cote backend.
                  DsButton(
                    label: 'Admin',
                    variant: DsButtonVariant.secondary,
                    size: DsButtonSize.small,
                    onPressed: () => onQuickLogin(
                      'admin@neo-domotique.fr',
                      'password123',
                    ),
                  ),
                  DsButton(
                    label: 'Intégrateur',
                    variant: DsButtonVariant.secondary,
                    size: DsButtonSize.small,
                    onPressed: () => onQuickLogin(
                      'jean.dupont@neo-domotique.fr',
                      'password123',
                    ),
                  ),
                  DsButton(
                    label: 'Auditeur',
                    variant: DsButtonVariant.secondary,
                    size: DsButtonSize.small,
                    onPressed: () => onQuickLogin(
                      'pierre.durand@neo-domotique.fr',
                      'password123',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DsSpacing.s4),
              // L'aide reste accessible avant meme d'etre connecte, mais dans
              // le flux : rien ne flotte par-dessus le formulaire.
              Consumer(
                builder: (context, ref, _) => DsButton(
                  label: 'Aide / Bug',
                  icon: DsGlyph.help,
                  variant: DsButtonVariant.ghost,
                  size: DsButtonSize.small,
                  onPressed: () => showFeedbackDialog(context, ref),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
