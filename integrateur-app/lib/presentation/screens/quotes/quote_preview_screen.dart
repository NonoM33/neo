import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_spacing.dart';

/// Quote PDF preview screen
class QuotePreviewScreen extends ConsumerWidget {
  final String quoteId;

  const QuotePreviewScreen({
    super.key,
    required this.quoteId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aperçu du devis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // Share PDF
            },
          ),
          IconButton(
            icon: const Icon(Icons.print),
            onPressed: () {
              // Print PDF
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.picture_as_pdf, size: 64),
            AppSpacing.vGapMd,
            Text('Quote ID: $quoteId'),
            AppSpacing.vGapMd,
            const Text('PDF Preview will be displayed here'),
          ],
        ),
      ),
    );
  }
}
