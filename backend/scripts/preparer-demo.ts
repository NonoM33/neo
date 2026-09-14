/**
 * Prepare une demonstration propre, profil par profil.
 *
 *   bun run scripts/preparer-demo.ts            # constate, ne change rien
 *   bun run scripts/preparer-demo.ts --appliquer
 *
 * Ce qu'il fait :
 *  - retire les projets et clients laisses par les tests de bout en bout
 *    (marqueurs « E2E- » et « Relais ») ;
 *  - confie un projet reel a l'auditeur, sinon son application est VIDE ;
 *  - verifie, pour chaque profil, qu'il voit ce qu'il doit voir.
 */
const API = process.env.E2E_API ?? 'http://localhost:3000/api';
const APPLIQUER = process.argv.includes('--appliquer');

const COMPTES = {
  admin: 'admin@neo-domotique.fr',
  integrateur: 'jean.dupont@neo-domotique.fr',
  auditeur: 'pierre.durand@neo-domotique.fr',
};

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texte = await res.text();
  let corps: any = null;
  try { corps = texte ? JSON.parse(texte) : null; } catch { corps = texte; }
  return { status: res.status, body: corps?.data ?? corps };
}

async function login(email: string) {
  const { status, body } = await call('POST', '/auth/login', undefined, {
    email, password: 'password123',
  });
  if (status !== 200) throw new Error(`connexion ${email} : ${status}`);
  return body.accessToken as string;
}

const EST_TEST = (nom: string) => /E2E|^Relais \d/.test(nom ?? '');

const admin = await login(COMPTES.admin);

// 1. Le menage
const projets = (await call('GET', '/projets?limit=100', admin)).body as any[];
const aSupprimer = projets.filter((p) => EST_TEST(p.name));
console.log(`projets de test : ${aSupprimer.length} sur ${projets.length}`);

if (APPLIQUER) {
  for (const p of aSupprimer) {
    const r = await call('DELETE', `/projets/${p.id}`, admin);
    if (r.status >= 400) console.log(`  echec suppression ${p.name} (${r.status})`);
  }
  console.log(`  ${aSupprimer.length} projet(s) retire(s)`);
}

const clients = (await call('GET', '/projets/clients?limit=100', admin)).body as any[];
const clientsTest = (Array.isArray(clients) ? clients : []).filter((c) =>
  EST_TEST(`${c.lastName ?? ''}`),
);
console.log(`clients de test : ${clientsTest.length}`);
if (APPLIQUER) {
  for (const c of clientsTest) await call('DELETE', `/projets/clients/${c.id}`, admin);
}

// 2. Un projet confie a l'auditeur
const utilisateurs = (await call('GET', '/users', admin)).body as any[];
const liste = Array.isArray(utilisateurs) ? utilisateurs : (utilisateurs as any).items ?? [];
const auditeur = liste.find((u: any) => u.email === COMPTES.auditeur);

const restants = (await call('GET', '/projets?limit=100', admin)).body as any[];
const reels = restants.filter((p) => !EST_TEST(p.name));
// On confie de preference une affaire reconnaissable : un nom de test
// affiche en demonstration ruine la credibilite de la demonstration.
const cible =
  reels.find((p: any) => /Villa|Maison|Appartement/i.test(p.name)) ?? reels[0];

if (!cible) {
  console.log('\nAUCUN projet reel : lancer `bun run db:seed` avant la demo.');
} else if (APPLIQUER && auditeur) {
  const r = await call('PUT', `/projets/${cible.id}/assigner`, admin, {
    assignedToId: auditeur.id,
  });
  console.log(`\nprojet confie a l auditeur : ${cible.name} (${r.status})`);
}

// 3. Verification par profil
console.log('\n--- ce que chaque profil voit ---');
for (const [role, email] of Object.entries(COMPTES)) {
  const token = await login(email);
  const vus = (await call('GET', '/projets', token)).body as any[];
  const propres = (vus ?? []).filter((p) => !EST_TEST(p.name)).length;
  const pollues = (vus ?? []).length - propres;
  console.log(
    `${role.padEnd(12)} ${String((vus ?? []).length).padStart(3)} projet(s)` +
      (pollues ? `  (dont ${pollues} de test)` : '') +
      (propres === 0 ? '   <-- ECRAN VIDE EN DEMO' : ''),
  );
}

if (!APPLIQUER) console.log('\n(constat seul — relancer avec --appliquer)');
