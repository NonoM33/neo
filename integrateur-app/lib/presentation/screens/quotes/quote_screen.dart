import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/quote.dart';
import '../../../routes/app_router.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';
import '../../blocs/quotes/quotes_bloc.dart';
import '../../widgets/ds/ds.dart';
import 'widgets/send_quote_dialog.dart';

/// Formatage monetaire francais : `1 234,56 €`, mention HT / TTC systematique.
final NumberFormat euro = NumberFormat.currency(
  locale: 'fr_FR',
  symbol: '€',
  decimalDigits: 2,
);

/// Devis du projet.
///
/// iPad paysage : **deux panneaux** — lignes editables a gauche, recapitulatif
/// et totaux dans un panneau lateral a droite. Ailleurs : barre de totaux
/// collante en bas, toujours visible pendant l'edition.
class QuoteScreen extends ConsumerStatefulWidget {
  const QuoteScreen({required this.projectId, super.key});

  final String projectId;

  @override
  ConsumerState<QuoteScreen> createState() => _QuoteScreenState();
}

class _QuoteScreenState extends ConsumerState<QuoteScreen> {
  bool _clientMode = false;

  @override
  void initState() {
    super.initState();
    ref.read(quotesBlocProvider).add(QuotesLoadRequested(widget.projectId));
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(quotesBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;
    final twoPanels = device.isDesktop && context.dsIsLandscape;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<QuotesBloc, QuotesState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is QuoteOperationSuccess) {
            showDsSnackbar(
              context,
              message: state.message,
              tone: DsTone.success,
            );
          }
          if (state is QuotesError) {
            showDsSnackbar(
              context,
              message: state.message,
              tone: DsTone.error,
            );
          }
        },
        builder: (context, state) {
          if (state is QuotesLoading || state is QuotesInitial) {
            return const SafeArea(child: DsSkeletonList(count: 4));
          }
          if (state is QuotesError) {
            return SafeArea(
              child: DsErrorState(
                kind: DsErrorKind.fromMessage(state.message),
                action: DsButton(
                  label: 'Réessayer',
                  icon: DsGlyph.refresh,
                  onPressed: () =>
                      bloc.add(QuotesLoadRequested(widget.projectId)),
                ),
              ),
            );
          }
          if (state is! QuotesLoaded) return const SizedBox.shrink();

          final quote = state.currentQuote;

          return Column(
            children: [
              if (_clientMode)
                DsClientModeBanner(
                  onExit: () => setState(() => _clientMode = false),
                ),
              DsAppBar(
                title: quote == null ? 'Devis' : 'Devis ${quote.number}',
                subtitle: quote == null
                    ? null
                    : '${quote.lines.length} ligne${quote.lines.length > 1 ? 's' : ''} · '
                        'créé le ${DateFormat('d MMMM yyyy', 'fr_FR').format(quote.date)}',
                backLabel: 'Retour au projet',
                onBack: () => context.goToProjectDetail(widget.projectId),
                actions: [
                  if (quote != null && !_clientMode)
                    DsIconButton(
                      icon: Icons.present_to_all_rounded,
                      label: 'Présenter au client',
                      onPressed: () => setState(() => _clientMode = true),
                    ),
                  if (quote != null)
                    DsIconButton(
                      icon: DsGlyph.print,
                      label: 'Aperçu PDF',
                      onPressed: () => context.goToQuotePreview(quote.id),
                    ),
                ],
              ),
              Expanded(
                child: quote == null
                    ? _EmptyQuote(
                        onCreate: () =>
                            bloc.add(QuoteCreateRequested(widget.projectId)),
                      )
                    : twoPanels
                        ? Row(
                            children: [
                              Expanded(
                                child: _LinesPane(
                                  quote: quote,
                                  bloc: bloc,
                                  clientMode: _clientMode,
                                  projectId: widget.projectId,
                                ),
                              ),
                              DsSidePanel(
                                title: 'Récapitulatif',
                                widthFactor: 0.3,
                                child: SingleChildScrollView(
                                  padding:
                                      const EdgeInsets.all(DsSpacing.s5),
                                  child: _Totals(
                                    quote: quote,
                                    layout: DsTotalsLayout.panel,
                                    clientMode: _clientMode,
                                    bloc: bloc,
                                  ),
                                ),
                              ),
                            ],
                          )
                        : Column(
                            children: [
                              Expanded(
                                child: _LinesPane(
                                  quote: quote,
                                  bloc: bloc,
                                  clientMode: _clientMode,
                                  projectId: widget.projectId,
                                ),
                              ),
                              _Totals(
                                quote: quote,
                                layout: DsTotalsLayout.sticky,
                                clientMode: _clientMode,
                                bloc: bloc,
                              ),
                            ],
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _EmptyQuote extends StatelessWidget {
  const _EmptyQuote({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return DsEmptyState(
      icon: DsGlyph.quote,
      title: 'Aucun devis pour ce projet',
      description:
          'Le devis reprend les besoins relevés pendant l’audit, pièce par pièce, et se signe sur place.',
      action: DsButton(
        label: 'Créer le devis',
        icon: DsGlyph.add,
        size: DsButtonSize.large,
        onPressed: onCreate,
      ),
    );
  }
}

class _LinesPane extends StatelessWidget {
  const _LinesPane({
    required this.quote,
    required this.bloc,
    required this.clientMode,
    required this.projectId,
  });

  final Quote quote;
  final QuotesBloc bloc;
  final bool clientMode;
  final String projectId;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final device = context.dsDevice;
    final locked = !quote.isEditable;

    if (quote.lines.isEmpty) {
      return DsEmptyState(
        icon: DsGlyph.catalogue,
        title: 'Devis vide',
        description:
            'Ajoutez les produits relevés pendant l’audit, la main d’œuvre et vos forfaits.',
        action: DsButton(
          label: 'Ajouter une ligne',
          icon: DsGlyph.add,
          onPressed: () => _openAddSheet(context),
        ),
      );
    }

    final byRoom = quote.linesByRoom;
    final rooms = byRoom.keys.toList()
      ..sort((a, b) => (a ?? 'zz').compareTo(b ?? 'zz'));

    return Stack(
      children: [
        ListView(
          padding: EdgeInsets.fromLTRB(
            DsSpacing.pagePadding(device),
            DsSpacing.s4,
            DsSpacing.pagePadding(device),
            DsSpacing.s16,
          ),
          children: [
            if (locked)
              Padding(
                padding: const EdgeInsets.only(bottom: DsSpacing.gapCard),
                child: DsErrorState(
                  kind: DsErrorKind.permission,
                  inline: true,
                  title: 'Devis ${quote.status.displayName.toLowerCase()}',
                  description:
                      'Il n’est plus modifiable. Dupliquez-le pour repartir d’une nouvelle version.',
                ),
              ),
            for (final room in rooms) ...[
              DsSectionTitle(room ?? 'Sans pièce'),
              const SizedBox(height: DsSpacing.s2),
              for (final line in byRoom[room]!) ...[
                DsQuoteLineRow(
                  type: line.type.dsType,
                  description: line.description,
                  room: null,
                  quantity: line.quantity,
                  unitPrice: euro.format(line.unitPriceHT),
                  total: euro.format(line.totalHT),
                  owned: line.clientOwned,
                  locked: locked,
                  onQuantityChanged: (value) => bloc.add(
                    QuoteUpdateLineQuantityRequested(
                      lineId: line.id,
                      quantity: value,
                    ),
                  ),
                  onRemove: () async {
                    final confirmed = await showDsConfirmDialog(
                      context,
                      title: 'Retirer cette ligne ?',
                      description: line.description,
                      confirmLabel: 'Retirer',
                    );
                    if (confirmed) {
                      bloc.add(QuoteRemoveLineRequested(line.id));
                    }
                  },
                ),
                const SizedBox(height: DsSpacing.s2),
              ],
              const SizedBox(height: DsSpacing.s4),
            ],
          ],
        ),
        if (!locked && !clientMode)
          Positioned(
            right: DsSpacing.s4,
            bottom: DsSpacing.s4,
            child: FloatingActionButton.extended(
              heroTag: 'add-quote-line',
              backgroundColor: ds.brandPrimary,
              foregroundColor: ds.textOnBrand,
              onPressed: () => _openAddSheet(context),
              icon: const Icon(DsGlyph.add),
              label: const Text('Ajouter une ligne'),
            ),
          ),
      ],
    );
  }

  Future<void> _openAddSheet(BuildContext context) async {
    await showDsSheet<void>(
      context,
      title: 'Ajouter au devis',
      subtitle: 'Produit du catalogue, main d’œuvre ou forfait',
      builder: (sheetContext) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DsButton(
            label: 'Produit du catalogue',
            icon: DsGlyph.catalogue,
            size: DsButtonSize.large,
            fullWidth: true,
            onPressed: () {
              Navigator.of(sheetContext).pop();
              _openProductPicker(context);
            },
          ),
          const SizedBox(height: DsSpacing.s2),
          DsButton(
            label: 'Main d’œuvre',
            icon: DsGlyph.engineering,
            variant: DsButtonVariant.secondary,
            fullWidth: true,
            onPressed: () {
              Navigator.of(sheetContext).pop();
              _openLaborDialog(context);
            },
          ),
          const SizedBox(height: DsSpacing.s2),
          DsButton(
            label: 'Aller au catalogue complet',
            icon: DsGlyph.search,
            variant: DsButtonVariant.ghost,
            fullWidth: true,
            onPressed: () {
              Navigator.of(sheetContext).pop();
              context.goToCatalogue();
            },
          ),
        ],
      ),
    );
  }

  Future<void> _openProductPicker(BuildContext context) async {
    await showDsSheet<void>(
      context,
      title: 'Produits du catalogue',
      detent: DsSheetDetent.large,
      builder: (sheetContext) => _ProductPicker(
        onPick: (product, quantity) {
          bloc.add(
            QuoteAddProductRequested(product: product, quantity: quantity),
          );
          Navigator.of(sheetContext).pop();
        },
      ),
    );
  }

  Future<void> _openLaborDialog(BuildContext context) async {
    final descriptionController = TextEditingController(text: 'Pose et mise en service');
    final priceController = TextEditingController(text: '55');
    final hoursController = TextEditingController(text: '1');

    final added = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => DsDialog(
        title: 'Main d’œuvre',
        description: 'Forfait ou taux horaire, en euros hors taxes.',
        icon: DsGlyph.engineering,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DsTextField(
              label: 'Description',
              controller: descriptionController,
              required: true,
            ),
            const SizedBox(height: DsSpacing.s4),
            Row(
              children: [
                Expanded(
                  child: DsTextField(
                    label: 'Prix / heure HT',
                    controller: priceController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                  ),
                ),
                const SizedBox(width: DsSpacing.s3),
                Expanded(
                  child: DsTextField(
                    label: 'Heures',
                    controller: hoursController,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.done,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          DsButton(
            label: 'Annuler',
            variant: DsButtonVariant.ghost,
            onPressed: () => Navigator.of(dialogContext).pop(false),
          ),
          DsButton(
            label: 'Ajouter',
            onPressed: () => Navigator.of(dialogContext).pop(true),
          ),
        ],
      ),
    );

    if (added ?? false) {
      final price =
          double.tryParse(priceController.text.replaceAll(',', '.')) ?? 0;
      final hours = int.tryParse(hoursController.text) ?? 1;
      bloc.add(
        QuoteAddLaborRequested(
          description: descriptionController.text.trim(),
          priceHT: price,
          hours: hours,
        ),
      );
    }

    descriptionController.dispose();
    priceController.dispose();
    hoursController.dispose();
  }
}

class _ProductPicker extends ConsumerStatefulWidget {
  const _ProductPicker({required this.onPick});

  final void Function(Product product, int quantity) onPick;

  @override
  ConsumerState<_ProductPicker> createState() => _ProductPickerState();
}

class _ProductPickerState extends ConsumerState<_ProductPicker> {
  String _query = '';

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(catalogueBlocProvider);
    if (bloc.state is CatalogueInitial) {
      bloc.add(const CatalogueLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(catalogueBlocProvider);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DsSearchBar(
          hintText: 'Rechercher un produit, une référence…',
          autofocus: true,
          onChanged: (value) => setState(() => _query = value.toLowerCase()),
        ),
        const SizedBox(height: DsSpacing.s3),
        SizedBox(
          height: 360,
          child: BlocBuilder<CatalogueBloc, CatalogueState>(
            bloc: bloc,
            builder: (context, state) {
              if (state is CatalogueLoading || state is CatalogueInitial) {
                return const DsSkeletonList(count: 3, padding: EdgeInsets.zero);
              }
              if (state is! CatalogueLoaded) {
                return const DsErrorState(kind: DsErrorKind.server);
              }
              final products = state.allProducts.where((product) {
                if (_query.isEmpty) return true;
                return '${product.name} ${product.reference} ${product.brand}'
                    .toLowerCase()
                    .contains(_query);
              }).toList();

              if (products.isEmpty) {
                return const DsEmptyState(
                  compact: true,
                  icon: DsGlyph.search,
                  title: 'Aucun produit ne correspond',
                  description:
                      'Essayez une référence, une marque, ou synchronisez le catalogue.',
                );
              }

              return ListView.separated(
                itemCount: products.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: DsSpacing.s2),
                itemBuilder: (context, index) {
                  final product = products[index];
                  return DsProductCard(
                    compact: true,
                    name: product.name,
                    brand: product.brand,
                    reference: product.reference,
                    priceHT: euro.format(product.salePrice),
                    stock: DsStockLevel.fromQuantity(product.stockAvailable),
                    protocols: product.protocols
                        .map((protocol) => protocol.displayName)
                        .toList(),
                    onTap: () => widget.onPick(product, 1),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Totals extends StatelessWidget {
  const _Totals({
    required this.quote,
    required this.layout,
    required this.clientMode,
    required this.bloc,
  });

  final Quote quote;
  final DsTotalsLayout layout;
  final bool clientMode;
  final QuotesBloc bloc;

  @override
  Widget build(BuildContext context) {
    final canSend = quote.canBeSent;

    return DsQuoteTotalsBar(
      layout: layout,
      clientMode: clientMode,
      quoteNumber: quote.number,
      validityLabel:
          'Valable jusqu’au ${DateFormat('d MMMM yyyy', 'fr_FR').format(quote.validityEndDate)}',
      subtotalHT: euro.format(quote.subtotalHT),
      discount: quote.discountHT > 0 ? '− ${euro.format(quote.discountHT)}' : null,
      totalHT: euro.format(quote.totalHT),
      vat: euro.format(quote.totalTVA),
      totalTTC: euro.format(quote.totalTTC),
      actions: clientMode
          ? null
          : Wrap(
              spacing: DsSpacing.s2,
              runSpacing: DsSpacing.s2,
              children: [
                DsButton(
                  label: 'Faire signer',
                  icon: DsGlyph.signature,
                  size: DsButtonSize.large,
                  // Menait vers l'apercu PDF, qui n'est qu'un bouchon : la
                  // signature — le geste qui conclut la vente — etait donc
                  // inatteignable depuis l'app.
                  onPressed: quote.lines.isEmpty
                      ? null
                      : () => context.goToQuoteSignature(quote.id, quote),
                ),
                DsButton(
                  label: 'Envoyer au client',
                  icon: DsGlyph.send,
                  variant: DsButtonVariant.secondary,
                  onPressed: canSend ? () => _send(context) : null,
                ),
              ],
            ),
    );
  }

  Future<void> _send(BuildContext context) async {
    final result = await SendQuoteDialog.show(
      context,
      quoteNumber: quote.number,
    );
    if (result == null) return;
    bloc.add(
      QuoteSendRequested(
        customMessage: result.customMessage,
        salesPersonName: result.salesPersonName,
      ),
    );
  }
}

/// Passerelle entre les types de ligne metier et ceux du Design System.
extension QuoteLineTypeDs on QuoteLineType {
  DsQuoteLineType get dsType => switch (this) {
        QuoteLineType.produit => DsQuoteLineType.produit,
        QuoteLineType.mainOeuvre => DsQuoteLineType.mainOeuvre,
        QuoteLineType.forfait => DsQuoteLineType.forfait,
      };
}
