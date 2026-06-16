import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierFilterSchema,
} from './suppliers.schema';
import * as suppliersService from './suppliers.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireIntegrateurOrAdmin } from '../../middleware/rbac.middleware';

const suppliersRouter = new Hono();

suppliersRouter.use('*', authMiddleware, requireIntegrateurOrAdmin());

// Lister les fournisseurs (avec recherche optionnelle)
suppliersRouter.get('/', zValidator('query', supplierFilterSchema), async (c) => {
  const { search } = c.req.valid('query');
  const list = await suppliersService.listSuppliers(search);
  return c.json(list);
});

// Détail d'un fournisseur (+ ses produits)
suppliersRouter.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const result = await suppliersService.getSupplierById(id);
  return c.json(result);
});

// Créer un fournisseur
suppliersRouter.post('/', zValidator('json', createSupplierSchema), async (c) => {
  const input = c.req.valid('json');
  const supplier = await suppliersService.createSupplier(input);
  return c.json(supplier, 201);
});

// Modifier un fournisseur
suppliersRouter.put('/:id', zValidator('json', updateSupplierSchema), async (c) => {
  const id = c.req.param('id')!;
  const input = c.req.valid('json');
  const supplier = await suppliersService.updateSupplier(id, input);
  return c.json(supplier);
});

// Supprimer un fournisseur
suppliersRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')!;
  await suppliersService.deleteSupplier(id);
  return c.json({ message: 'Fournisseur supprimé' });
});

export default suppliersRouter;
