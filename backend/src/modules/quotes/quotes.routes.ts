import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createQuoteSchema, updateQuoteSchema } from './quotes.schema';
import * as quotesService from './quotes.service';
import * as productsService from '../products/products.service';
import { generateQuotePdf, type QuotePdfInput } from './quote-pdf.service';
import { createQuoteFromChecklist } from './quote-from-checklist.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireCRMAccess } from '../../middleware/rbac.middleware';
import { paginationSchema } from '../../lib/pagination';

const { stripQuoteCostFields } = quotesService;

const fromChecklistSchema = z.object({
  roomIds: z.array(z.string().uuid()).optional(),
  discount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  validityDays: z.coerce.number().int().positive().optional(),
});

/** Build the pdf-service input from a quote-with-project-details payload. */
function toPdfInput(quote: Awaited<ReturnType<typeof quotesService.getQuoteWithProjectDetails>>): QuotePdfInput {
  return {
    quote: {
      number: quote.number,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      totalHT: quote.totalHT,
      totalTVA: quote.totalTVA,
      totalTTC: quote.totalTTC,
      discount: quote.discount,
      notes: quote.notes,
    },
    client: {
      firstName: quote.client?.firstName ?? '',
      lastName: quote.client?.lastName ?? '',
      email: quote.client?.email ?? null,
      address: quote.client?.address ?? null,
      postalCode: quote.client?.postalCode ?? null,
      city: quote.client?.city ?? null,
    },
    project: {
      name: quote.project?.name ?? '',
      address: quote.project?.address ?? null,
      city: quote.project?.city ?? null,
      postalCode: quote.project?.postalCode ?? null,
    },
    lines: quote.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity ?? 1,
      unitPriceHT: line.unitPriceHT ?? '0',
      tvaRate: line.tvaRate ?? '0',
      totalHT: line.totalHT ?? '0',
      clientOwned: line.clientOwned ?? false,
    })),
  };
}

const quotesRouter = new Hono();

quotesRouter.use('*', authMiddleware, requireCRMAccess());

// Global quote list for the staff back-office (admin / commercial / integrateur)
quotesRouter.get(
  '/devis',
  zValidator(
    'query',
    paginationSchema.merge(
      z.object({
        search: z.string().optional(),
        status: z.enum(['brouillon', 'envoye', 'accepte', 'refuse', 'expire']).optional(),
      })
    )
  ),
  async (c) => {
    const { page, limit, search, status } = c.req.valid('query');
    const result = await quotesService.getAllQuotes({ page, limit }, { search, status });
    return c.json(result);
  }
);

// Get quotes by project
quotesRouter.get('/projets/:projectId/devis', async (c) => {
  const projectId = c.req.param('projectId');
  const user = c.get('user');
  const quotesList = await quotesService.getQuotesByProject(projectId, user.userId, user.role);
  return c.json(quotesList.map(q => stripQuoteCostFields(q)));
});

// Create quote for project
quotesRouter.post(
  '/projets/:projectId/devis',
  zValidator('json', createQuoteSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const input = c.req.valid('json');
    const user = c.get('user');
    const quote = await quotesService.createQuote(projectId, input, user.userId, user.role);
    return c.json(stripQuoteCostFields(quote), 201);
  }
);

// Create a draft quote from the project's checklist (fuzzy product matching).
// One-shot endpoint used by the app's "Générer devis depuis l'audit" button.
quotesRouter.post(
  '/projets/:projectId/devis/from-checklist',
  zValidator('json', fromChecklistSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const input = c.req.valid('json');
    const user = c.get('user');
    const result = await createQuoteFromChecklist(
      { projectId, ...input },
      user.userId,
      user.role,
    );
    return c.json(result, 201);
  },
);

// Get quote by ID
quotesRouter.get('/devis/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const quote = await quotesService.getQuoteById(id, user.userId, user.role);
  return c.json(stripQuoteCostFields(quote));
});

// Update quote
quotesRouter.put('/devis/:id', zValidator('json', updateQuoteSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const user = c.get('user');
  const quote = await quotesService.updateQuote(id, input, user.userId, user.role);
  return c.json(stripQuoteCostFields(quote));
});

// Delete quote
quotesRouter.delete('/devis/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  await quotesService.deleteQuote(id, user.userId, user.role);
  return c.json({ message: 'Devis supprimé' });
});

// Vérifier les dépendances manquantes dans un devis
quotesRouter.get('/devis/:id/dependances-manquantes', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const quote = await quotesService.getQuoteById(id, user.userId, user.role);

  // Construire la liste {productId, quantity} en incluant les clientOwned
  // (ils comptent comme "présents" pour couvrir les dépendances)
  const allProductLines: { productId: string; quantity: number }[] = quote.lines
    .filter((line: any) => line.product?.id)
    .map((line: any) => ({
      productId: line.product.id,
      quantity: line.quantity ?? 1,
    }));

  const missing = await productsService.checkMissingDependencies(allProductLines);

  // Exclure les manquants déjà couverts par des produits clientOwned
  const clientOwnedProductIds = new Set(
    quote.lines
      .filter((line: any) => line.product?.id && line.clientOwned)
      .map((line: any) => line.product.id)
  );
  const actuallyMissing = missing.filter(
    (m) => !clientOwnedProductIds.has(m.requiredProductId)
  );

  return c.json({
    quoteId: id,
    missing: actuallyMissing,
    hasMissingDependencies: actuallyMissing.length > 0,
  });
});

// Generate PDF (returns a real application/pdf binary)
quotesRouter.get('/devis/:id/pdf', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const quote = await quotesService.getQuoteWithProjectDetails(id, user.userId, user.role);

  const pdfBytes = await generateQuotePdf(toPdfInput(quote));

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${quote.number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});

// Send quote by email
quotesRouter.post('/devis/:id/envoyer', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as {
    customMessage?: string;
    salesPersonName?: string;
  };
  const result = await quotesService.sendQuote(id, user.userId, user.role, {
    customMessage: body.customMessage,
    salesPersonName: body.salesPersonName,
  });
  return c.json(result);
});

export default quotesRouter;
