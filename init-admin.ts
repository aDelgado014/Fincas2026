import { db } from './backend/db/index.ts';
import { users } from './backend/db/schema.ts';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  const adminEmail = 'admin@bluecrabai.es';
  const existing = await db.query.users.findFirst({
    where: eq(users.email, adminEmail)
  });

  if (!existing) {
    await db.insert(users).values({
      id: uuidv4(),
      name: 'Super Admin',
      email: adminEmail,
      password: 'Auror@090423', // En producción, hashear con bcrypt
      role: 'superadmin'
    });
    console.log('Superadmin user created successfuly.');
  } else {
    console.log('Superadmin user already exists.');
  }
}

seedAdmin().catch(console.error);
