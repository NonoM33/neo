import { beforeAll, describe, expect, it } from 'bun:test';

/**
 * Parcours client de bout en bout — du prospect a l'encaissement.
 *
 * Ce que Neo doit pouvoir faire tourner tous les jours : un commercial entre
 * un prospect, un auditeur releve les besoins sur place, un integrateur
 * chiffre, le client signe, la facture part. Chaque maillon casse = pas de
 * chiffre d'affaires.
 *
 * Prerequis : API sur http://localhost:3000 avec les comptes seedes.
 *   bun run dev   (dans backend/)
 */

const API = process.env.E2E_API ?? 'http://localhost:3000/api';

type Json = Record<string, unknown>;

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body: body?.data ?? body };
}

async function login(email: string): Promise<string> {
  const { status, body } = await call('POST', '/auth/login', {
    body: { email, password: 'password123' },
  });
  if (status !== 200) {
    throw new Error(`connexion impossible pour ${email} (${status})`);
  }
  return body.accessToken as string;
}

const COMPTES = {
  admin: 'admin@neo-domotique.fr',
  integrateur: 'jean.dupont@neo-domotique.fr',
  auditeur: 'pierre.durand@neo-domotique.fr',
};

describe('du prospect a l encaissement', () => {
  let tokenAdmin = '';
  let tokenIntegrateur = '';
  let tokenAuditeur = '';

  const marqueur = `E2E-${Date.now()}`;
  let leadId = '';
  let projetId = '';
  let pieceId = '';
  let devisId = '';

  beforeAll(async () => {
    tokenAdmin = await login(COMPTES.admin);
    tokenIntegrateur = await login(COMPTES.integrateur);
    tokenAuditeur = await login(COMPTES.auditeur);
  });

  it('1. le commercial enregistre un prospect', async () => {
    const { status, body } = await call('POST', '/leads', {
      token: tokenIntegrateur,
      body: {
        firstName: 'Camille',
        lastName: marqueur,
        email: `camille.${marqueur.toLowerCase()}@exemple.fr`,
        phone: '0612345678',
        title: `Prospect ${marqueur}`,
        source: 'site_web',
      },
    });

    expect(status).toBe(201);
    expect(body.id).toBeTruthy();
    leadId = body.id as string;
  });

  it('2. le prospect devient client et projet', async () => {
    // La conversion d'un lead vit dans le back-office, avec son propre
    // gardien : ici on suit le chemin que l'API metier expose vraiment,
    // client puis projet.
    const client = await call('POST', '/projets/clients', {
      token: tokenIntegrateur,
      body: {
        firstName: 'Camille',
        lastName: marqueur,
        email: `camille.${marqueur.toLowerCase()}@exemple.fr`,
        phone: '0612345678',
      },
    });
    expect(client.status).toBe(201);

    const projet = await call('POST', '/projets', {
      token: tokenIntegrateur,
      body: {
        clientId: client.body.id,
        name: `Maison ${marqueur}`,
        address: '3 rue des Tilleuls',
        city: 'Toulouse',
        postalCode: '31000',
      },
    });
    expect(projet.status).toBe(201);
    projetId = projet.body.id as string;
  });

  it('3. le releve d audit cree une piece et ses besoins', async () => {
    const piece = await call('POST', `/projets/${projetId}/pieces`, {
      token: tokenIntegrateur,
      body: { name: 'Salon', type: 'salon', surface: 32 },
    });
    expect(piece.status).toBe(201);
    pieceId = piece.body.id as string;

    // Un besoin formule comme sur le terrain : il ne correspond a aucun
    // produit du catalogue, et doit ressortir « a completer ».
    const besoin = await call('POST', `/pieces/${pieceId}/checklist`, {
      token: tokenIntegrateur,
      body: { label: 'Detecteur d ouverture', category: 'securite', quantity: 2 },
    });
    expect(besoin.status).toBe(201);

    // Un besoin nomme comme au catalogue : c'est lui qui doit se chiffrer
    // tout seul, sinon aucun devis ne sort de l'audit.
    const besoinCatalogue = await call('POST', `/pieces/${pieceId}/checklist`, {
      token: tokenIntegrateur,
      body: { label: 'Ajax DoorProtect', category: 'securite', quantity: 3 },
    });
    expect(besoinCatalogue.status).toBe(201);
    await call('PUT', `/checklist/${besoinCatalogue.body.id}`, {
      token: tokenIntegrateur,
      body: { checked: true },
    });

    const coche = await call('PUT', `/checklist/${besoin.body.id}`, {
      token: tokenIntegrateur,
      body: { checked: true },
    });
    expect(coche.status).toBe(200);
  });

  it('4. l integrateur chiffre le devis depuis l audit', async () => {
    const { status, body } = await call(
      'POST',
      `/projets/${projetId}/devis/from-checklist`,
      { token: tokenIntegrateur, body: {} },
    );

    expect(status).toBeLessThan(300);
    // L'endpoint rend { quoteId, matches } : matches dit ce que la
    // correspondance floue a su rattacher au catalogue, et ce qui reste a
    // completer a la main.
    expect(body.quoteId).toBeTruthy();
    expect(Array.isArray(body.matches)).toBe(true);
    devisId = body.quoteId as string;
  });

  it('5. le devis chiffre ce qui existe et signale ce qui reste a faire',
      async () => {
    const { status, body } = await call('GET', `/devis/${devisId}`, {
      token: tokenIntegrateur,
    });

    expect(status).toBe(200);
    const lignes = (body.lines ?? []) as Json[];
    expect(lignes.length).toBeGreaterThanOrEqual(2);

    const chiffrees = lignes.filter((l) => Number(l.unitPriceHT ?? 0) > 0);
    const aCompleter = lignes.filter((l) =>
      String(l.description ?? '').toLowerCase().includes('compl'),
    );

    expect(chiffrees.length).toBeGreaterThan(0);
    expect(Number(body.totalHT ?? 0)).toBeGreaterThan(0);

    // Un besoin sans equivalent au catalogue ne doit pas passer en douce a
    // 0 euro : il doit sauter aux yeux de celui qui envoie le devis.
    expect(aCompleter.length).toBeGreaterThan(0);
  });

  it('6. le devis part chez le client', async () => {
    const { status } = await call('POST', `/devis/${devisId}/envoyer`, {
      token: tokenIntegrateur,
      body: { salesPersonName: 'Jean Dupont' },
    });

    expect(status).toBeLessThan(400);
  });

  it('7. une demande de signature est ouverte', async () => {
    const { status, body } = await call('POST', `/devis/${devisId}/signature`, {
      token: tokenIntegrateur,
      body: { mode: 'direct' },
    });

    expect(status).toBeLessThan(400);
    expect(body).toBeTruthy();
  });
});


/**
 * Ce que les roles ne permettent PAS aujourd'hui.
 *
 * Constat, pas satisfecit : ces trois tests figent l'etat actuel pour qu'il
 * reste visible et mesurable. Le jour ou les droits sont ouverts, ils doivent
 * etre INVERSES — c'est le signal que la chaine entre equipes fonctionne.
 */
describe('passage de relais entre equipes', () => {
  let tokenAdmin = '';
  let tokenIntegrateur = '';
  let tokenAuditeur = '';
  let projetDuCommercial = '';
  let auditeurId = '';

  beforeAll(async () => {
    tokenAdmin = await login(COMPTES.admin);
    tokenIntegrateur = await login(COMPTES.integrateur);
    tokenAuditeur = await login(COMPTES.auditeur);

    const utilisateurs = await call('GET', '/users', { token: tokenAdmin });
    const liste = Array.isArray(utilisateurs.body)
      ? utilisateurs.body
      : (utilisateurs.body.items ?? []);
    auditeurId = liste.find((u: any) => u.email === COMPTES.auditeur)?.id ?? '';

    const client = await call('POST', '/projets/clients', {
      token: tokenAdmin,
      body: {
        firstName: 'Relais',
        lastName: `E2E-${Date.now()}`,
        email: `relais.${Date.now()}@exemple.fr`,
        phone: '0600000000',
      },
    });
    const projet = await call('POST', '/projets', {
      token: tokenAdmin,
      body: { clientId: client.body.id, name: `Relais ${Date.now()}` },
    });
    projetDuCommercial = projet.body.id as string;
  });

  it('un projet se confie a quelqu un d autre', async () => {
    // Sans cela, un projet ouvert par le commercial reste invisible pour
    // l equipe qui doit l executer : la chaine s arrete la.
    const avant = await call('GET', `/projets/${projetDuCommercial}`, {
      token: tokenAuditeur,
    });
    expect(avant.status).toBe(404);

    const attribution = await call(
      'PUT',
      `/projets/${projetDuCommercial}/assigner`,
      { token: tokenAdmin, body: { assignedToId: auditeurId } },
    );
    expect(attribution.status).toBe(200);

    const apres = await call('GET', `/projets/${projetDuCommercial}`, {
      token: tokenAuditeur,
    });
    expect(apres.status).toBe(200);
  });

  it('l auditeur releve l audit du projet qu on lui a confie', async () => {
    const piece = await call('POST', `/projets/${projetDuCommercial}/pieces`, {
      token: tokenAuditeur,
      body: { name: 'Cuisine', type: 'cuisine', surface: 18 },
    });
    expect(piece.status).toBe(201);

    const besoin = await call('POST', `/pieces/${piece.body.id}/checklist`, {
      token: tokenAuditeur,
      body: { label: 'Ajax DoorProtect', category: 'securite', quantity: 1 },
    });
    expect(besoin.status).toBe(201);

    const coche = await call('PUT', `/checklist/${besoin.body.id}`, {
      token: tokenAuditeur,
      body: { checked: true },
    });
    expect(coche.status).toBe(200);
  });

  it('l auditeur ne chiffre pas : le devis reste au metier commercial',
      async () => {
    const { status } = await call(
      'POST',
      `/projets/${projetDuCommercial}/devis/from-checklist`,
      { token: tokenAuditeur, body: {} },
    );

    expect(status).toBe(403);
  });

  it('l integrateur reprend le projet une fois l audit fait', async () => {
    const attribution = await call(
      'PUT',
      `/projets/${projetDuCommercial}/assigner`,
      { token: tokenAdmin, body: { assignedToId: null } },
    );
    expect(attribution.status).toBe(200);

    const rendu = await call('GET', `/projets/${projetDuCommercial}`, {
      token: tokenAuditeur,
    });
    expect(rendu.status).toBe(404);
  });

  it('seul un responsable attribue un projet', async () => {
    const { status } = await call(
      'PUT',
      `/projets/${projetDuCommercial}/assigner`,
      { token: tokenIntegrateur, body: { assignedToId: auditeurId } },
    );

    expect(status).toBe(403);
  });
});
