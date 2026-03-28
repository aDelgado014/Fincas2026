import { Router } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { operatorAllowed } from './role.middleware.ts';
import bcrypt from 'bcryptjs';

const router = Router();

// Get current user profile
router.get('/profile', operatorAllowed, async (req: any, res) => {
  try {
    const sessionUser = req.auth?.user;
    if (!sessionUser) return res.status(401).json({ error: 'No autenticado' });

    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      image: users.image
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.patch('/profile', operatorAllowed, async (req: any, res) => {
  try {
    const sessionUser = req.auth?.user;
    const { name, email } = req.body;

    if (!sessionUser) return res.status(401).json({ error: 'No autenticado' });

    await db.update(users)
      .set({ name, email })
      .where(eq(users.id, sessionUser.id));

    res.json({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', operatorAllowed, async (req: any, res) => {
  try {
    const sessionUser = req.auth?.user;
    const { currentPassword, newPassword } = req.body;

    if (!sessionUser) return res.status(401).json({ error: 'No autenticado' });

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user || !user.password) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, sessionUser.id));

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

