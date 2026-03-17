import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/quote.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/catalogue_repository.dart' show CatalogueRepository, ProductFilter;
import '../../blocs/quotes/quotes_bloc.dart';

class QuoteScreen extends ConsumerStatefulWidget {
  final String projectId;

  const QuoteScreen({super.key, required this.projectId});

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
                      tooltip: 'Generer PDF',
                    ),
                    FilledButton(
                      onPressed: state.isSending
                          ? null
                          : () {
                              HapticFeedback.lightImpact();
                              quotesBloc.add(const QuoteSendRequested());
                            },
                      child: state.isSending
                          ? const SizedBox(
                              width: 20, height: 20,
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
                  Icon(Icons.error_outline, size: 64, color: colorScheme.error),
                  AppSpacing.vGapMd,
                  Text(state.message, style: Theme.of(context).textTheme.bodyLarge),
                  AppSpacing.vGapMd,
                  FilledButton.icon(
                    onPressed: () => quotesBloc.add(QuotesLoadRequested(widget.projectId)),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Reessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is QuotesLoaded) {
            if (state.currentQuote == null) {
              return _buildEmptyState(quotesBloc);
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
              onPressed: () => _showAddLineSheet(context, quotesBloc),
              icon: const Icon(Icons.add),
              label: const Text('Ajouter'),
              tooltip: 'Ajouter une ligne au devis',
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildEmptyState(QuotesBloc bloc) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
          AppSpacing.vGapMd,
          Text(
            'Aucun devis',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          AppSpacing.vGapXs,
          Text(
            'Creez un devis pour ce projet',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.vGapLg,
          FilledButton.icon(
            onPressed: () {
              HapticFeedback.lightImpact();
              bloc.add(QuoteCreateRequested(widget.projectId));
            },
            icon: const Icon(Icons.add),
            label: const Text('Creer un devis'),
          ),
        ],
      ),
    );
  }

  Widget _buildQuoteEditor(BuildContext context, QuotesBloc bloc, Quote quote) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    if (isWide) {
      return Row(
        children: [
          // Lines list - main content
          Expanded(
            flex: 6,
            child: Column(
              children: [
                _buildQuoteHeader(context, quote),
                Expanded(
                  child: quote.lines.isEmpty
                      ? _buildEmptyLines(context)
                      : ListView.builder(
                          padding: AppSpacing.pagePadding,
                          itemCount: quote.lines.length,
                          itemBuilder: (context, index) {
                            return _buildLineItem(context, bloc, quote.lines[index]);
                          },
                        ),
                ),
              ],
            ),
          ),
          const VerticalDivider(width: 1),
          // Totals panel - sidebar
          SizedBox(
            width: 320,
            child: _buildTotalsPanel(context, quote),
          ),
        ],
      );
    }

    // Mobile/narrow: stacked layout
    return Column(
      children: [
        _buildQuoteHeader(context, quote),
        Expanded(
          child: quote.lines.isEmpty
              ? _buildEmptyLines(context)
              : ListView.builder(
                  padding: AppSpacing.pagePadding,
                  itemCount: quote.lines.length,
                  itemBuilder: (context, index) {
                    return _buildLineItem(context, bloc, quote.lines[index]);
                  },
                ),
        ),
        _buildTotalsBar(context, quote),
      ],
    );
  }

  Widget _buildQuoteHeader(BuildContext context, Quote quote) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: AppSpacing.cardPadding,
      color: colorScheme.surfaceContainerHighest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Devis ${quote.number}', style: textTheme.titleLarge),
              const SizedBox(height: 2),
              Text('Cree le ${quote.date.formatted}', style: textTheme.bodySmall),
            ],
          ),
          Chip(
            label: Text(quote.status.displayName),
            backgroundColor: _getStatusColor(quote.status).withAlpha(30),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyLines(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.list, size: 64, color: colorScheme.onSurfaceVariant),
          AppSpacing.vGapMd,
          Text(
            'Aucun element',
            style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          AppSpacing.vGapXs,
          Text('Appuyez sur + pour ajouter des produits',
              style: textTheme.bodySmall),
        ],
      ),
    );
  }

  /// Totals as a sidebar panel (tablet wide)
  Widget _buildTotalsPanel(BuildContext context, Quote quote) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        border: Border(left: BorderSide(color: colorScheme.primary, width: 3)),
      ),
      padding: AppSpacing.cardPaddingLarge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Resume', style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 20),
          _buildTotalRow(context, 'Sous-total HT', quote.subtotalHT),
          if (quote.discountHT > 0)
            _buildTotalRow(context, 'Remise', -quote.discountHT, isDiscount: true),
          _buildTotalRow(context, 'Total HT', quote.totalHT),
          _buildTotalRow(context, 'TVA', quote.totalTVA),
          const Divider(height: 24),
          _buildTotalRow(context, 'Total TTC', quote.totalTTC, isFinal: true),
          const Spacer(),
          Text(
            '${quote.lines.length} ligne${quote.lines.length > 1 ? 's' : ''}',
            style: textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  /// Totals as bottom bar (mobile)
  Widget _buildTotalsBar(BuildContext context, Quote quote) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withAlpha(20),
            blurRadius: 8,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
    );
  }

  Widget _buildLineItem(BuildContext context, QuotesBloc bloc, QuoteLine line) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Dismissible(
      key: Key(line.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: colorScheme.error,
          borderRadius: AppRadius.borderRadiusLg,
        ),
        child: Icon(Icons.delete, color: colorScheme.onError),
      ),
      confirmDismiss: (_) async {
        HapticFeedback.mediumImpact();
        return true;
      },
      onDismissed: (_) => bloc.add(QuoteRemoveLineRequested(line.id)),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Type icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer,
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(
                  _getLineTypeIcon(line.type),
                  color: colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              // Description & quantity
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.description,
                      style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w500),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${line.quantity} x ${line.unitPriceHT.asCurrency} HT',
                      style: textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Total
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(line.totalHT.asCurrency,
                      style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text('HT', style: textTheme.bodySmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTotalRow(BuildContext context, String label, double value,
      {bool isFinal = false, bool isDiscount = false}) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: isFinal ? textTheme.titleMedium : textTheme.bodyMedium),
          Text(value.asCurrency,
              style: (isFinal ? textTheme.titleLarge : textTheme.bodyMedium)?.copyWith(
                fontWeight: isFinal ? FontWeight.bold : null,
                color: isDiscount ? colorScheme.tertiary : null,
              )),
        ],
      ),
    );
  }

  // Add Line Sheet - centered dialog on tablet, bottom sheet on mobile

  void _showAddLineSheet(BuildContext context, QuotesBloc bloc) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    if (isWide) {
      // Use dialog on tablet
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Ajouter au devis'),
          content: ConstrainedBox(
            constraints: AppSpacing.dialogConstraints,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildAddOption(
                  ctx,
                  icon: Icons.inventory_2,
                  title: 'Produit du catalogue',
                  subtitle: 'Rechercher et ajouter',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showProductPicker(context, bloc);
                  },
                ),
                const SizedBox(height: 8),
                _buildAddOption(
                  ctx,
                  icon: Icons.edit_note,
                  title: 'Ligne personnalisee',
                  subtitle: 'Saisie libre',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showCustomLineDialog(context, bloc);
                  },
                ),
                const SizedBox(height: 8),
                _buildAddOption(
                  ctx,
                  icon: Icons.engineering,
                  title: 'Main d\'oeuvre',
                  subtitle: 'Forfait ou horaire',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showLaborDialog(context, bloc);
                  },
                ),
              ],
            ),
          ),
        ),
      );
    } else {
      // Bottom sheet on mobile
      showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.inventory_2),
                title: const Text('Ajouter un produit du catalogue'),
                subtitle: const Text('Rechercher et ajouter'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showProductPicker(context, bloc);
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit_note),
                title: const Text('Ligne personnalisee'),
                subtitle: const Text('Saisie libre'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showCustomLineDialog(context, bloc);
                },
              ),
              ListTile(
                leading: const Icon(Icons.engineering),
                title: const Text('Main d\'oeuvre'),
                subtitle: const Text('Forfait ou horaire'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showLaborDialog(context, bloc);
                },
              ),
            ],
          ),
        ),
      );
    }
  }

  Widget _buildAddOption(BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      borderRadius: AppRadius.borderRadiusMd,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusMd,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleSmall),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  // Product Picker

  void _showProductPicker(BuildContext context, QuotesBloc bloc) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      constraints: isWide ? AppSpacing.bottomSheetConstraints : null,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (ctx, scrollController) => _ProductPickerSheet(
          scrollController: scrollController,
          catalogueRepository: ref.read(catalogueRepositoryProvider),
          onProductSelected: (product, quantity) {
            bloc.add(QuoteAddProductRequested(
              product: product,
              quantity: quantity,
            ));
            Navigator.pop(ctx);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${product.name} ajoute au devis'),
                duration: const Duration(seconds: 2),
              ),
            );
          },
        ),
      ),
    );
  }

  // Custom Line Dialog

  void _showCustomLineDialog(BuildContext context, QuotesBloc bloc) {
    final descCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ligne personnalisee'),
        content: ConstrainedBox(
          constraints: AppSpacing.dialogConstraints,
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Description'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Requis' : null,
                  textInputAction: TextInputAction.next,
                ),
                AppSpacing.vGapMd,
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: priceCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Prix unitaire HT', suffixText: '\u20AC',
                        ),
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        validator: (v) {
                          final p = double.tryParse(v ?? '');
                          return (p == null || p <= 0) ? 'Prix invalide' : null;
                        },
                      ),
                    ),
                    AppSpacing.hGapMd,
                    SizedBox(
                      width: 100,
                      child: TextFormField(
                        controller: qtyCtrl,
                        decoration: const InputDecoration(labelText: 'Quantite'),
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        validator: (v) {
                          final q = int.tryParse(v ?? '');
                          return (q == null || q <= 0) ? 'Invalide' : null;
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                HapticFeedback.lightImpact();
                bloc.add(QuoteAddLaborRequested(
                  description: descCtrl.text.trim(),
                  priceHT: double.parse(priceCtrl.text),
                  hours: int.parse(qtyCtrl.text),
                ));
                Navigator.pop(ctx);
              }
            },
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
  }

  // Labor Dialog

  void _showLaborDialog(BuildContext context, QuotesBloc bloc) {
    final descCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final hoursCtrl = TextEditingController(text: '1');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Main d\'oeuvre'),
        content: ConstrainedBox(
          constraints: AppSpacing.dialogConstraints,
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Description'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Requis' : null,
                  textInputAction: TextInputAction.next,
                ),
                AppSpacing.vGapMd,
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: priceCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Prix/heure HT', suffixText: '\u20AC',
                        ),
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        validator: (v) {
                          final p = double.tryParse(v ?? '');
                          return (p == null || p <= 0) ? 'Prix invalide' : null;
                        },
                      ),
                    ),
                    AppSpacing.hGapMd,
                    SizedBox(
                      width: 100,
                      child: TextFormField(
                        controller: hoursCtrl,
                        decoration: const InputDecoration(labelText: 'Heures'),
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        validator: (v) {
                          final q = int.tryParse(v ?? '');
                          return (q == null || q <= 0) ? 'Invalide' : null;
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                HapticFeedback.lightImpact();
                bloc.add(QuoteAddLaborRequested(
                  description: descCtrl.text.trim(),
                  priceHT: double.parse(priceCtrl.text),
                  hours: int.parse(hoursCtrl.text),
                ));
                Navigator.pop(ctx);
              }
            },
            child: const Text('Ajouter'),
          ),
        ],
      ),
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
        return AppTheme.statusArchive;
      case QuoteStatus.envoye:
        return AppTheme.statusEnCours;
      case QuoteStatus.accepte:
        return AppTheme.successColor;
      case QuoteStatus.refuse:
        return AppTheme.errorColor;
      case QuoteStatus.expire:
        return AppTheme.warningColor;
    }
  }
}

// Product Picker Widget

class _ProductPickerSheet extends StatefulWidget {
  final ScrollController scrollController;
  final CatalogueRepository catalogueRepository;
  final void Function(Product product, int quantity) onProductSelected;

  const _ProductPickerSheet({
    required this.scrollController,
    required this.catalogueRepository,
    required this.onProductSelected,
  });

  @override
  State<_ProductPickerSheet> createState() => _ProductPickerSheetState();
}

class _ProductPickerSheetState extends State<_ProductPickerSheet> {
  final _searchController = TextEditingController();
  List<Product> _products = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProducts([String? query]) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await widget.catalogueRepository.getProducts(
        filter: query != null && query.isNotEmpty
            ? ProductFilter(searchQuery: query)
            : null,
        limit: 50,
      );

      if (result is Success<List<Product>>) {
        setState(() {
          _products = result.data;
          _loading = false;
        });
      } else if (result is Error) {
        setState(() {
          _error = (result as Error).failure.message;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _onSearch(String query) {
    _loadProducts(query);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        // Handle
        Center(
          child: Container(
            margin: const EdgeInsets.only(top: 8),
            width: 40, height: 4,
            decoration: BoxDecoration(
              color: colorScheme.onSurfaceVariant.withAlpha(80),
              borderRadius: AppRadius.borderRadiusXs,
            ),
          ),
        ),

        // Title + search
        Padding(
          padding: AppSpacing.cardPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ajouter un produit',
                  style: Theme.of(context).textTheme.titleLarge),
              AppSpacing.vGapSm,
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Rechercher un produit...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          tooltip: 'Effacer',
                          onPressed: () {
                            _searchController.clear();
                            _loadProducts();
                          },
                        )
                      : null,
                ),
                onChanged: _onSearch,
              ),
            ],
          ),
        ),

        // Product list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _products.isEmpty
                      ? const Center(child: Text('Aucun produit trouve'))
                      : ListView.builder(
                          controller: widget.scrollController,
                          itemCount: _products.length,
                          itemBuilder: (context, index) {
                            final product = _products[index];
                            return _ProductTile(
                              product: product,
                              onAdd: (qty) => widget.onProductSelected(product, qty),
                            );
                          },
                        ),
        ),
      ],
    );
  }
}

class _ProductTile extends StatefulWidget {
  final Product product;
  final void Function(int quantity) onAdd;

  const _ProductTile({required this.product, required this.onAdd});

  @override
  State<_ProductTile> createState() => _ProductTileState();
}

class _ProductTileState extends State<_ProductTile> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Product info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      style: textTheme.titleSmall,
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  if (product.reference.isNotEmpty)
                    Text('Ref: ${product.reference}',
                        style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant)),
                  if (product.brand.isNotEmpty)
                    Text(product.brand, style: textTheme.bodySmall),
                  AppSpacing.vGapXs,
                  Text('${product.salePrice.asCurrency} HT',
                      style: textTheme.titleSmall?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ),

            // Quantity selector + add button
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline),
                  tooltip: 'Reduire la quantite',
                  onPressed: _quantity > 1
                      ? () => setState(() => _quantity--)
                      : null,
                ),
                SizedBox(
                  width: 32,
                  child: Center(
                    child: Text('$_quantity', style: textTheme.titleSmall),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline),
                  tooltip: 'Augmenter la quantite',
                  onPressed: () => setState(() => _quantity++),
                ),
                AppSpacing.hGapSm,
                FilledButton.tonal(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    widget.onAdd(_quantity);
                  },
                  child: const Text('Ajouter'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
