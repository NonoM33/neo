import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/quote.dart';
import '../../../routes/app_router.dart';
import '../../blocs/quotes/quotes_bloc.dart';

/// Quote editor screen
class QuoteScreen extends ConsumerStatefulWidget {
  final String projectId;

  const QuoteScreen({
    super.key,
    required this.projectId,
  });

  @override
  ConsumerState<QuoteScreen> createState() => _QuoteScreenState();
}

class _QuoteScreenState extends ConsumerState<QuoteScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(quotesBlocProvider).add(QuotesLoadRequested(widget.projectId));
  }

  @override
  Widget build(BuildContext context) {
    final quotesBloc = ref.watch(quotesBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devis'),
        actions: [
          BlocBuilder<QuotesBloc, QuotesState>(
            bloc: quotesBloc,
            builder: (context, state) {
              if (state is QuotesLoaded && state.currentQuote != null) {
                return Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.picture_as_pdf),
                      onPressed: state.isGeneratingPdf
                          ? null
                          : () => quotesBloc.add(const QuoteGeneratePdfRequested()),
                      tooltip: 'Générer PDF',
                    ),
                    FilledButton(
                      onPressed: state.isSending
                          ? null
                          : () => quotesBloc.add(const QuoteSendRequested()),
                      child: state.isSending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Envoyer'),
                    ),
                    AppSpacing.hGapMd,
                  ],
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: BlocBuilder<QuotesBloc, QuotesState>(
        bloc: quotesBloc,
        builder: (context, state) {
          if (state is QuotesLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is QuotesError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: colorScheme.error),
                  AppSpacing.vGapMd,
                  Text(state.message),
                  AppSpacing.vGapMd,
                  ElevatedButton(
                    onPressed: () {
                      quotesBloc.add(QuotesLoadRequested(widget.projectId));
                    },
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is QuotesLoaded) {
            if (state.currentQuote == null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.receipt_long,
                      size: 64,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    AppSpacing.vGapMd,
                    const Text('Aucun devis'),
                    AppSpacing.vGapMd,
                    FilledButton.icon(
                      onPressed: () {
                        quotesBloc.add(QuoteCreateRequested(widget.projectId));
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Créer un devis'),
                    ),
                  ],
                ),
              );
            }

            return _buildQuoteEditor(context, quotesBloc, state.currentQuote!);
          }

          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: BlocBuilder<QuotesBloc, QuotesState>(
        bloc: quotesBloc,
        builder: (context, state) {
          if (state is QuotesLoaded && state.currentQuote != null) {
            return FloatingActionButton.extended(
              onPressed: () => _showAddLineDialog(context, quotesBloc),
              icon: const Icon(Icons.add),
              label: const Text('Ajouter'),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildQuoteEditor(
    BuildContext context,
    QuotesBloc bloc,
    Quote quote,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      children: [
        // Quote header
        Container(
          padding: AppSpacing.cardPadding,
          color: colorScheme.surfaceContainerHighest,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Devis ${quote.number}',
                    style: textTheme.titleLarge,
                  ),
                  Text(
                    'Créé le ${quote.date.formatted}',
                    style: textTheme.bodySmall,
                  ),
                ],
              ),
              Chip(
                label: Text(quote.status.displayName),
                backgroundColor: _getStatusColor(quote.status).withAlpha(30),
              ),
            ],
          ),
        ),

        // Lines list
        Expanded(
          child: quote.lines.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.list,
                        size: 48,
                        color: colorScheme.onSurfaceVariant,
                      ),
                      AppSpacing.vGapMd,
                      const Text('Aucun élément'),
                      AppSpacing.vGapXs,
                      const Text('Ajoutez des produits ou de la main d\'oeuvre'),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: AppSpacing.pagePadding,
                  itemCount: quote.lines.length,
                  itemBuilder: (context, index) {
                    return _buildLineItem(context, bloc, quote.lines[index]);
                  },
                ),
        ),

        // Totals
        Container(
          padding: AppSpacing.cardPadding,
          decoration: BoxDecoration(
            color: colorScheme.surface,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(20),
                blurRadius: 8,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildTotalRow(context, 'Sous-total HT', quote.subtotalHT),
              if (quote.discountHT > 0)
                _buildTotalRow(context, 'Remise', -quote.discountHT, isDiscount: true),
              _buildTotalRow(context, 'Total HT', quote.totalHT),
              _buildTotalRow(context, 'TVA', quote.totalTVA),
              const Divider(),
              _buildTotalRow(context, 'Total TTC', quote.totalTTC, isFinal: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLineItem(BuildContext context, QuotesBloc bloc, QuoteLine line) {
    final textTheme = Theme.of(context).textTheme;

    return Dismissible(
      key: Key(line.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        bloc.add(QuoteRemoveLineRequested(line.id));
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Icon(
              _getLineTypeIcon(line.type),
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          title: Text(line.description),
          subtitle: Text(
            '${line.quantity} x ${line.unitPriceHT.asCurrency} HT',
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                line.totalHT.asCurrency,
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'HT',
                style: textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTotalRow(
    BuildContext context,
    String label,
    double value, {
    bool isFinal = false,
    bool isDiscount = false,
  }) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: isFinal ? textTheme.titleMedium : textTheme.bodyMedium,
          ),
          Text(
            value.asCurrency,
            style: (isFinal ? textTheme.titleLarge : textTheme.bodyMedium)?.copyWith(
              fontWeight: isFinal ? FontWeight.bold : null,
              color: isDiscount ? Colors.green : null,
            ),
          ),
        ],
      ),
    );
  }

  void _showAddLineDialog(BuildContext context, QuotesBloc bloc) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.inventory_2),
                title: const Text('Ajouter un produit'),
                subtitle: const Text('Depuis le catalogue'),
                onTap: () {
                  Navigator.pop(context);
                  context.goToCatalogue();
                },
              ),
              ListTile(
                leading: const Icon(Icons.engineering),
                title: const Text('Ajouter main d\'oeuvre'),
                subtitle: const Text('Forfait ou horaire'),
                onTap: () {
                  Navigator.pop(context);
                  _showAddLaborDialog(context, bloc);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAddLaborDialog(BuildContext context, QuotesBloc bloc) {
    final descriptionController = TextEditingController();
    final priceController = TextEditingController();
    final hoursController = TextEditingController(text: '1');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Ajouter main d\'oeuvre'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                ),
              ),
              AppSpacing.vGapMd,
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: priceController,
                      decoration: const InputDecoration(
                        labelText: 'Prix/heure HT',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  AppSpacing.hGapMd,
                  SizedBox(
                    width: 80,
                    child: TextField(
                      controller: hoursController,
                      decoration: const InputDecoration(
                        labelText: 'Heures',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () {
                final price = double.tryParse(priceController.text) ?? 0;
                final hours = int.tryParse(hoursController.text) ?? 1;

                bloc.add(QuoteAddLaborRequested(
                  description: descriptionController.text,
                  priceHT: price,
                  hours: hours,
                ));
                Navigator.pop(context);
              },
              child: const Text('Ajouter'),
            ),
          ],
        );
      },
    );
  }

  IconData _getLineTypeIcon(QuoteLineType type) {
    switch (type) {
      case QuoteLineType.produit:
        return Icons.inventory_2;
      case QuoteLineType.mainOeuvre:
        return Icons.engineering;
      case QuoteLineType.forfait:
        return Icons.work;
    }
  }

  Color _getStatusColor(QuoteStatus status) {
    switch (status) {
      case QuoteStatus.brouillon:
        return Colors.grey;
      case QuoteStatus.envoye:
        return Colors.blue;
      case QuoteStatus.accepte:
        return Colors.green;
      case QuoteStatus.refuse:
        return Colors.red;
    }
  }
}
