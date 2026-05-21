import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../domain/entities/room.dart';
import '../../../../domain/repositories/auth_repository.dart';
import '../../../../routes/app_router.dart';

/// CTA that lives at the bottom of the audit screen.
///
/// One tap generates a draft quote from the project's checked checklist
/// items (server-side fuzzy product matching), then navigates to the
/// quote screen so the salesperson can adjust quantities/prices before
/// sending the PDF to the client.
class GenerateQuoteButton extends ConsumerStatefulWidget {
  final String projectId;
  final List<Room> rooms;

  const GenerateQuoteButton({
    super.key,
    required this.projectId,
    required this.rooms,
  });

  @override
  ConsumerState<GenerateQuoteButton> createState() =>
      _GenerateQuoteButtonState();
}

class _GenerateQuoteButtonState extends ConsumerState<GenerateQuoteButton> {
  bool _loading = false;

  int get _checkedItemsCount {
    return widget.rooms.fold<int>(
      0,
      (sum, room) => sum + room.checkedItemsCount,
    );
  }

  Future<void> _onTap() async {
    HapticFeedback.lightImpact();
    if (_checkedItemsCount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cochez d\'abord des items dans la checklist'),
        ),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Générer un devis depuis l\'audit ?'),
        content: Text(
          '$_checkedItemsCount item(s) coché(s) seront proposés sous forme '
          'de lignes de devis avec une suggestion de produit pour chacun. '
          'Vous pourrez ajuster avant l\'envoi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.description_outlined, size: 18),
            label: const Text('Générer'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _loading = true);
    final repo = ref.read(quoteRepositoryProvider);
    final result = await repo.createFromChecklist(widget.projectId);
    if (!mounted) return;

    setState(() => _loading = false);

    switch (result) {
      case Success(data: final draft):
        final unmatched = draft.unmatchedCount;
        final matched = draft.matchedCount;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              unmatched == 0
                  ? 'Devis généré · $matched ligne(s) auto-remplie(s)'
                  : 'Devis généré · $matched auto, $unmatched à compléter',
            ),
            backgroundColor:
                unmatched == 0 ? AppTheme.successColor : AppTheme.warningColor,
          ),
        );
        context.goToQuote(widget.projectId);
      case Error(failure: final failure):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${failure.message}'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final disabled = _checkedItemsCount == 0;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: (_loading || disabled) ? null : _onTap,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(56),
            backgroundColor: cs.primary,
            foregroundColor: cs.onPrimary,
            shape: RoundedRectangleBorder(
              borderRadius: AppRadius.borderRadiusMd,
            ),
          ),
          icon: _loading
              ? SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(cs.onPrimary),
                  ),
                )
              : const Icon(Icons.description_outlined, size: 20),
          label: Text(
            _loading
                ? 'Génération du devis…'
                : disabled
                    ? 'Cochez des items pour générer un devis'
                    : 'Générer un devis ($_checkedItemsCount item(s))',
          ),
        ),
      ),
    );
  }
}
