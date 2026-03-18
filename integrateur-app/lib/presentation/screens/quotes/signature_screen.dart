import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/quote.dart';
import '../../../domain/entities/signature_request.dart';
import 'direct_signing_screen.dart';

// ============================================================================
// Signature screen — main entry point from QuoteScreen
// ============================================================================

class SignatureScreen extends ConsumerStatefulWidget {
  final Quote quote;

  const SignatureScreen({
    super.key,
    required this.quote,
  });

  @override
  ConsumerState<SignatureScreen> createState() => _SignatureScreenState();
}

class _SignatureScreenState extends ConsumerState<SignatureScreen> {
  SignatureRequest? _request;
  bool _loading = true;
  bool _creating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRequest();
  }

  Future<void> _loadRequest() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ds = ref.read(signatureDataSourceProvider);
      final request = await ds.getSignatureRequest(widget.quote.id);
      if (mounted) setState(() { _request = request; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _createRequest(String mode) async {
    setState(() { _creating = true; _error = null; });
    HapticFeedback.lightImpact();
    try {
      final ds = ref.read(signatureDataSourceProvider);
      final result = await ds.createSignatureRequest(widget.quote.id, mode);

      await _loadRequest();

      if (!mounted) return;

      if (mode == 'direct') {
        final requestId = result['id'] as String?;
        if (requestId != null && requestId.isNotEmpty) {
          _openDirectSigning(requestId);
        } else {
          setState(() { _error = 'Impossible d\'obtenir l\'ID de signature. Réessayez.'; });
        }
      } else {
        // Remote: Documenso email sent
        final sentTo = result['sentTo'] as String?;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(sentTo != null
                ? 'Email de signature envoyé à $sentTo'
                : 'Email de signature envoyé au client'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _creating = false; });
    }
  }

  Future<void> _refreshStatus() async {
    try {
      final ds = ref.read(signatureDataSourceProvider);
      await ds.refreshSignatureStatus(widget.quote.id);
      await _loadRequest();
    } catch (_) {}
  }

  void _openDirectSigning(String requestId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => DirectSigningScreen(
          signatureRequestId: requestId,
          quote: widget.quote,
        ),
      ),
    ).then((signed) {
      if (signed == true) _loadRequest();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Signature — ${widget.quote.number}'),
        actions: [
          if (_request != null && _request!.isPending)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _refreshStatus,
              tooltip: 'Actualiser le statut',
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : _request == null
                  ? _buildNoRequest()
                  : _buildRequestStatus(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Theme.of(context).colorScheme.error),
            AppSpacing.vGapMd,
            Text(_error!, textAlign: TextAlign.center),
            AppSpacing.vGapMd,
            FilledButton.icon(
              onPressed: _loadRequest,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoRequest() {
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppSpacing.vGapLg,
          Icon(Icons.draw_outlined, size: 72, color: colorScheme.primary),
          AppSpacing.vGapMd,
          Text(
            'Faire signer le devis',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          AppSpacing.vGapSm,
          Text(
            'Choisissez comment le client va signer le devis ${widget.quote.number} incluant les CGV et CGU.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          AppSpacing.vGapXl,

          // Remote signing option
          _buildSigningOption(
            icon: Icons.email_outlined,
            title: 'Signature à distance',
            subtitle: 'Un email est envoyé au client avec un lien pour signer depuis son appareil.',
            badge: 'EMAIL',
            badgeColor: colorScheme.primary,
            onTap: _creating ? null : () => _createRequest('remote'),
          ),

          AppSpacing.vGapMd,

          // Direct/in-person signing option
          _buildSigningOption(
            icon: Icons.tablet_mac_outlined,
            title: 'Signature en direct',
            subtitle: 'Le client signe directement sur l\'iPad, sur place. Idéal pour la signature en rendez-vous.',
            badge: 'IPAD',
            badgeColor: colorScheme.tertiary,
            onTap: _creating ? null : () => _createRequest('direct'),
          ),

          if (_creating) ...[
            AppSpacing.vGapLg,
            const Center(child: CircularProgressIndicator()),
            AppSpacing.vGapSm,
            Text('Préparation du contrat...', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
          ],
        ],
      ),
    );
  }

  Widget _buildSigningOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required String badge,
    required Color badgeColor,
    required VoidCallback? onTap,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: badgeColor.withAlpha(20),
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(icon, color: badgeColor, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(badge, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.chevron_right, color: colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRequestStatus() {
    final request = _request!;
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    Color statusColor;
    IconData statusIcon;
    switch (request.status) {
      case SignatureStatus.signed:
        statusColor = AppTheme.successColor;
        statusIcon = Icons.check_circle;
        break;
      case SignatureStatus.pending:
        statusColor = colorScheme.primary;
        statusIcon = Icons.pending_outlined;
        break;
      case SignatureStatus.declined:
        statusColor = AppTheme.errorColor;
        statusIcon = Icons.cancel_outlined;
        break;
      case SignatureStatus.expired:
        statusColor = AppTheme.warningColor;
        statusIcon = Icons.timer_off_outlined;
        break;
      default:
        statusColor = colorScheme.onSurfaceVariant;
        statusIcon = Icons.info_outline;
    }

    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(statusIcon, size: 64, color: statusColor),
                  AppSpacing.vGapMd,
                  Text(
                    request.status.displayName,
                    style: textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                  AppSpacing.vGapSm,
                  Text(
                    request.isRemote
                        ? 'Signature par email'
                        : 'Signature en direct (iPad)',
                    style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),

          AppSpacing.vGapMd,

          // Details card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Détails', style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  AppSpacing.vGapSm,
                  _buildDetailRow('Signataire', request.signerName),
                  _buildDetailRow('Email', request.signerEmail),
                  _buildDetailRow('Mode', request.isRemote ? 'A distance (email)' : 'En direct (iPad)'),
                  _buildDetailRow('Créé le', _formatDate(request.createdAt)),
                ],
              ),
            ),
          ),

          AppSpacing.vGapMd,

          // Actions
          if (request.isPending && request.isDirect) ...[
            FilledButton.icon(
              onPressed: () => _openDirectSigning(request.id),
              icon: const Icon(Icons.draw),
              label: const Text('Ouvrir la page de signature'),
            ),
            AppSpacing.vGapSm,
          ],

          if (request.isPending) ...[
            OutlinedButton.icon(
              onPressed: _refreshStatus,
              icon: const Icon(Icons.refresh),
              label: const Text('Actualiser le statut'),
            ),
            AppSpacing.vGapSm,
            OutlinedButton.icon(
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Annuler la demande'),
                    content: const Text('Êtes-vous sûr de vouloir annuler cette demande de signature ?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
                      FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Oui, annuler')),
                    ],
                  ),
                );
                if (confirm == true) {
                  final ds = ref.read(signatureDataSourceProvider);
                  await ds.cancelSignatureRequest(widget.quote.id);
                  await _loadRequest();
                }
              },
              icon: Icon(Icons.cancel_outlined, color: colorScheme.error),
              label: Text('Annuler', style: TextStyle(color: colorScheme.error)),
            ),
          ],

          if (request.status == SignatureStatus.declined ||
              request.status == SignatureStatus.expired ||
              request.status == SignatureStatus.cancelled) ...[
            AppSpacing.vGapSm,
            FilledButton.icon(
              onPressed: _creating ? null : () => _showNewRequestSheet(),
              icon: const Icon(Icons.refresh),
              label: const Text('Nouvelle demande de signature'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            )),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  void _showNewRequestSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.email_outlined),
              title: const Text('Signature à distance'),
              subtitle: const Text('Envoyer un email de signature'),
              onTap: () {
                Navigator.pop(ctx);
                _createRequest('remote');
              },
            ),
            ListTile(
              leading: const Icon(Icons.tablet_mac_outlined),
              title: const Text('Signature en direct (iPad)'),
              subtitle: const Text('Le client signe sur cet appareil'),
              onTap: () {
                Navigator.pop(ctx);
                _createRequest('direct');
              },
            ),
          ],
        ),
      ),
    );
  }
}
