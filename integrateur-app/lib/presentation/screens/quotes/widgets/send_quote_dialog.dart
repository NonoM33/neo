import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_spacing.dart';

/// Dialog used to confirm sending the quote to the client.
///
/// Captures an optional personalized message (inserted into the email body)
/// and the salesperson's name (shown in the email signature). Returns the
/// captured values to the caller, or null if the user cancels.
class SendQuoteDialog extends StatefulWidget {
  /// Optional — only used for display (the backend resolves the actual
  /// recipient from the project's client record).
  final String? clientEmail;
  final String quoteNumber;
  final String? defaultSalesPersonName;

  const SendQuoteDialog({
    super.key,
    this.clientEmail,
    required this.quoteNumber,
    this.defaultSalesPersonName,
  });

  /// Returns null when cancelled; an outcome record otherwise.
  static Future<SendQuoteResult?> show(
    BuildContext context, {
    String? clientEmail,
    required String quoteNumber,
    String? defaultSalesPersonName,
  }) {
    return showDialog<SendQuoteResult>(
      context: context,
      builder: (_) => SendQuoteDialog(
        clientEmail: clientEmail,
        quoteNumber: quoteNumber,
        defaultSalesPersonName: defaultSalesPersonName,
      ),
    );
  }

  @override
  State<SendQuoteDialog> createState() => _SendQuoteDialogState();
}

class _SendQuoteDialogState extends State<SendQuoteDialog> {
  late final TextEditingController _messageController;
  late final TextEditingController _nameController;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
    _nameController = TextEditingController(
      text: widget.defaultSalesPersonName ?? '',
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _submit() {
    HapticFeedback.lightImpact();
    final msg = _messageController.text.trim();
    final name = _nameController.text.trim();
    Navigator.pop(
      context,
      SendQuoteResult(
        customMessage: msg.isEmpty ? null : msg,
        salesPersonName: name.isEmpty ? null : name,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;

    return AlertDialog(
      constraints: AppSpacing.dialogConstraints,
      title: Row(
        children: [
          Icon(Icons.mail_outline_rounded, color: cs.primary, size: 22),
          AppSpacing.hGapSm,
          Expanded(
            child: Text('Envoyer le devis ${widget.quoteNumber}'),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: AppRadius.borderRadiusSm,
              ),
              child: Row(
                children: [
                  Icon(Icons.person_outline_rounded,
                      size: 16, color: cs.onSurfaceVariant),
                  AppSpacing.hGapXs,
                  Expanded(
                    child: Text(
                      widget.clientEmail ?? 'Email du client (depuis la fiche)',
                      style: tt.bodyMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            AppSpacing.vGapLg,
            Text('Votre prénom et nom', style: tt.labelMedium),
            AppSpacing.vGapXs,
            TextField(
              controller: _nameController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                hintText: 'Ex: Renaud Cosson',
              ),
            ),
            AppSpacing.vGapMd,
            Text('Message personnalisé (optionnel)', style: tt.labelMedium),
            AppSpacing.vGapXs,
            TextField(
              controller: _messageController,
              minLines: 3,
              maxLines: 6,
              textInputAction: TextInputAction.newline,
              decoration: const InputDecoration(
                hintText:
                    "Bonjour, voici votre devis suite à notre rendez-vous d'audit du …",
              ),
            ),
            AppSpacing.vGapSm,
            Text(
              'Le devis sera envoyé en PDF en pièce jointe.',
              style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        FilledButton.icon(
          onPressed: _submit,
          icon: const Icon(Icons.send_rounded, size: 18),
          label: const Text('Envoyer'),
        ),
      ],
    );
  }
}

class SendQuoteResult {
  final String? customMessage;
  final String? salesPersonName;

  const SendQuoteResult({this.customMessage, this.salesPersonName});
}
