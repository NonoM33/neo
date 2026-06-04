import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/feedback_service.dart';
import '../../../core/theme/app_spacing.dart';
import '../../blocs/auth/auth_state.dart';
import '../../../core/di/providers.dart';
import '../../../routes/app_router.dart';

/// Wraps the whole app and paints a floating feedback button in the
/// bottom-right corner. Tapping it opens the guided report dialog.
class FeedbackOverlay extends ConsumerWidget {
  const FeedbackOverlay({required this.child, super.key});

  final Widget child;

  String _currentRoute(WidgetRef ref) {
    try {
      return ref
          .read(routerProvider)
          .routerDelegate
          .currentConfiguration
          .uri
          .toString();
    } catch (_) {
      return '';
    }
  }

  String? _reporterEmail(WidgetRef ref) {
    final state = ref.read(authBlocProvider).state;
    if (state is AuthAuthenticated) return state.user.email;
    return null;
  }

  String? _reporterName(WidgetRef ref) {
    final state = ref.read(authBlocProvider).state;
    if (state is AuthAuthenticated) return state.user.fullName;
    return null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Stack(
      children: [
        child,
        Positioned(
          right: AppSpacing.lg,
          bottom: AppSpacing.lg,
          child: _FeedbackFab(
            onTap: () {
              HapticFeedback.lightImpact();
              final route = _currentRoute(ref);
              final viewport = MediaQuery.of(context).size;
              showDialog<void>(
                context: context,
                builder: (_) => FeedbackDialog(
                  route: route,
                  viewport: viewport,
                  defaultEmail: _reporterEmail(ref),
                  defaultName: _reporterName(ref),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _FeedbackFab extends StatelessWidget {
  const _FeedbackFab({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.primary,
      shape: const StadiumBorder(),
      elevation: 3,
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Container(
          constraints: const BoxConstraints(minWidth: 56, minHeight: 56),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.feedback_outlined, color: cs.onPrimary, size: 24),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Aide / Bug',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: cs.onPrimary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Guided dialog with two tabs: report a problem and track previous reports.
class FeedbackDialog extends ConsumerStatefulWidget {
  const FeedbackDialog({
    required this.route,
    required this.viewport,
    this.defaultEmail,
    this.defaultName,
    super.key,
  });

  final String route;
  final Size viewport;
  final String? defaultEmail;
  final String? defaultName;

  @override
  ConsumerState<FeedbackDialog> createState() => _FeedbackDialogState();
}

class _FeedbackDialogState extends ConsumerState<FeedbackDialog>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _steps = TextEditingController();
  final _expected = TextEditingController();
  final _email = TextEditingController();

  String _kind = 'bug';
  String _severity = 'majeur';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _email.text = widget.defaultEmail ?? '';
  }

  @override
  void dispose() {
    _tabs.dispose();
    _title.dispose();
    _description.dispose();
    _steps.dispose();
    _expected.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    HapticFeedback.lightImpact();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      final feedbackContext = FeedbackService.instance.buildContext(
        widget.route,
        widget.viewport,
      );
      await FeedbackService.instance.submit(
        kind: _kind,
        title: _title.text.trim(),
        description: _description.text.trim(),
        severity: _kind == 'bug' ? _severity : 'mineur',
        stepsToReproduce: _kind == 'bug' ? _steps.text.trim() : null,
        expectedResult: _kind == 'bug' ? _expected.text.trim() : null,
        reporterEmail: _email.text.trim().isEmpty ? null : _email.text.trim(),
        reporterName: widget.defaultName,
        context: feedbackContext,
      );
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(content: Text('Merci ! Votre retour a bien été envoyé.')),
      );
    } catch (_) {
      if (mounted) setState(() => _submitting = false);
      messenger.showSnackBar(
        const SnackBar(
          content: Text("Échec de l'envoi. Vérifiez votre connexion."),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.xxl),
      ),
      child: ConstrainedBox(
        constraints: AppSpacing.dialogConstraints,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.sm,
                0,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Signaler un problème',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Fermer',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            TabBar(
              controller: _tabs,
              labelColor: cs.primary,
              tabs: const [
                Tab(text: 'Signaler'),
                Tab(text: 'Mes retours'),
              ],
            ),
            Flexible(
              child: TabBarView(
                controller: _tabs,
                children: [
                  _buildForm(context),
                  _MyReportsTab(email: widget.defaultEmail ?? _email.text),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final isBug = _kind == 'bug';
    return SingleChildScrollView(
      padding: AppSpacing.dialogPadding,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: AppSpacing.sm,
              children: [
                ChoiceChip(
                  label: const Text('Bug'),
                  avatar: const Icon(Icons.bug_report_outlined, size: 18),
                  selected: _kind == 'bug',
                  onSelected: (_) => setState(() => _kind = 'bug'),
                ),
                ChoiceChip(
                  label: const Text('Idée / amélioration'),
                  avatar: const Icon(Icons.lightbulb_outline, size: 18),
                  selected: _kind == 'amelioration',
                  onSelected: (_) => setState(() => _kind = 'amelioration'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.formFieldSpacing),
            TextFormField(
              controller: _title,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Titre *',
                hintText: 'Résumez le problème en une phrase',
              ),
              validator: (v) => (v == null || v.trim().length < 3)
                  ? 'Donnez un titre (3 caractères min.)'
                  : null,
            ),
            const SizedBox(height: AppSpacing.formFieldSpacing),
            if (isBug) ...[
              DropdownButtonFormField<String>(
                initialValue: _severity,
                decoration: const InputDecoration(labelText: 'Gravité'),
                items: const [
                  DropdownMenuItem(value: 'bloquant', child: Text('Bloquant')),
                  DropdownMenuItem(value: 'majeur', child: Text('Majeur')),
                  DropdownMenuItem(value: 'mineur', child: Text('Mineur')),
                  DropdownMenuItem(
                      value: 'cosmetique', child: Text('Cosmétique')),
                ],
                onChanged: (v) => setState(() => _severity = v ?? 'majeur'),
              ),
              const SizedBox(height: AppSpacing.formFieldSpacing),
            ],
            TextFormField(
              controller: _description,
              textInputAction: TextInputAction.newline,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: isBug ? 'Que s\'est-il passé ? *' : 'Votre idée *',
                hintText: isBug
                    ? 'Décrivez ce qui ne va pas'
                    : 'Décrivez l\'amélioration souhaitée',
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().length < 5)
                  ? 'Décrivez un peu plus en détail'
                  : null,
            ),
            if (isBug) ...[
              const SizedBox(height: AppSpacing.formFieldSpacing),
              TextFormField(
                controller: _steps,
                maxLines: 3,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  labelText: 'Étapes pour reproduire',
                  hintText: '1. ... 2. ... 3. ...',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.formFieldSpacing),
              TextFormField(
                controller: _expected,
                maxLines: 2,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  labelText: 'Résultat attendu',
                  hintText: 'Ce qui aurait dû se passer',
                  alignLabelWithHint: true,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.formFieldSpacing),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Votre email (pour le suivi)',
                hintText: 'vous@exemple.fr',
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            _ContextHint(route: widget.route),
            const SizedBox(height: AppSpacing.lg),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
                label: Text(_submitting ? 'Envoi...' : 'Envoyer le retour'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(120, 52),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContextHint extends StatelessWidget {
  const _ContextHint({required this.route});

  final String route;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withAlpha(80),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, size: 18, color: cs.onSurfaceVariant),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Nous joignons automatiquement la page courante, la version de l\'app et les logs récents pour accélérer le traitement.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MyReportsTab extends StatefulWidget {
  const _MyReportsTab({required this.email});

  final String email;

  @override
  State<_MyReportsTab> createState() => _MyReportsTabState();
}

class _MyReportsTabState extends State<_MyReportsTab> {
  late final TextEditingController _email =
      TextEditingController(text: widget.email);
  Future<List<FeedbackItem>>? _future;

  @override
  void initState() {
    super.initState();
    if (widget.email.trim().isNotEmpty) _load();
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  void _load() {
    setState(() {
      _future = FeedbackService.instance.fetchMine(_email.text.trim());
    });
  }

  static const Map<String, String> _statusLabels = {
    'ouvert': 'Ouvert',
    'corrige': 'Corrigé',
    'valide': 'Clôturé',
    'a_revoir': 'À revoir',
  };

  Color _statusColor(BuildContext context, String status) {
    final cs = Theme.of(context).colorScheme;
    switch (status) {
      case 'valide':
        return cs.tertiary;
      case 'corrige':
        return cs.primary;
      case 'a_revoir':
        return cs.error;
      default:
        return cs.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: AppSpacing.dialogPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Votre email',
                    hintText: 'vous@exemple.fr',
                  ),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              FilledButton(
                onPressed: _load,
                style: FilledButton.styleFrom(
                  minimumSize: const Size(56, 52),
                ),
                child: const Icon(Icons.search),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Flexible(
            child: _future == null
                ? const Center(
                    child: Text('Entrez votre email pour voir vos retours.'),
                  )
                : FutureBuilder<List<FeedbackItem>>(
                    future: _future,
                    builder: (context, snap) {
                      if (snap.connectionState == ConnectionState.waiting) {
                        return const Center(
                          child: CircularProgressIndicator(),
                        );
                      }
                      if (snap.hasError) {
                        return const Center(
                          child: Text('Impossible de charger vos retours.'),
                        );
                      }
                      final items = snap.data ?? const [];
                      if (items.isEmpty) {
                        return const Center(
                          child: Text('Aucun retour pour cet email.'),
                        );
                      }
                      return ListView.separated(
                        itemCount: items.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (context, i) =>
                            _reportCard(context, items[i]),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _reportCard(BuildContext context, FeedbackItem item) {
    final cs = Theme.of(context).colorScheme;
    final statusColor = _statusColor(context, item.status);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withAlpha(60),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: cs.outlineVariant.withAlpha(60)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(40),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Text(
                  _statusLabels[item.status] ?? item.status,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: statusColor,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
            ],
          ),
          if (item.comments.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            ...item.comments.map(
              (c) => Padding(
                padding: const EdgeInsets.only(top: AppSpacing.xs),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.reply, size: 16, color: cs.primary),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        '${c.author} : ${c.message}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
