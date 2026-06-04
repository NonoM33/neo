import { db } from '../src/config/database';
import { users } from '../src/db/schema/users';
import { clients } from '../src/db/schema';
import { hashPassword } from '../src/modules/auth/auth.service';
import * as ticketsService from '../src/support/tickets/tickets.service';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'admin@neo.test';
const ADMIN_PASSWORD = 'Test1234!';

async function main() {
  const [existingAdmin] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  let adminId = existingAdmin?.id;
  if (!adminId) {
    const [admin] = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        password: await hashPassword(ADMIN_PASSWORD),
        firstName: 'Admin',
        lastName: 'Test',
        role: 'admin',
        isActive: true,
      })
      .returning();
    adminId = admin!.id;
    console.log('Admin créé:', ADMIN_EMAIL, '/', ADMIN_PASSWORD);
  } else {
    console.log('Admin déjà présent:', ADMIN_EMAIL);
  }

  const [existingClient] = await db.select().from(clients).limit(1);
  let clientId = existingClient?.id;
  if (!clientId) {
    const [client] = await db
      .insert(clients)
      .values({ firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@example.com' })
      .returning();
    clientId = client!.id;
    console.log('Client créé:', client!.firstName, client!.lastName);
  }

  const tk = await ticketsService.createTicket(
    {
      title: 'Box hors ligne après coupure de courant',
      description: 'La box ne se reconnecte pas au cloud depuis la coupure de ce matin.',
      priority: 'haute',
      source: 'portail',
      clientId: clientId!,
    },
    adminId,
  );
  console.log('Ticket créé:', tk!.number);

  console.log('\nSeed terminé. Connexion staff:', ADMIN_EMAIL, '/', ADMIN_PASSWORD);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed échoué:', err);
  process.exit(1);
});
