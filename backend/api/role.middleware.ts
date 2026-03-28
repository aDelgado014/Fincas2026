import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dev_key_change_in_production';

export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verificar JWT si req.user no está ya establecido por requireAuth
    if (!(req as any).user) {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        return res.status(401).json({ error: 'No autenticado. Token requerido.' });
      }
      try {
        (req as any).user = jwt.verify(token, JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
      }
    }

    const user = (req as any).user;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Acceso denegado: permisos insuficientes (Requiere: ' + roles.join(', ') + ')' });
    }

    next();
  };
};

export const superadminOnly = checkRole(['superadmin']);
export const adminOnly = checkRole(['superadmin', 'admin']);
export const operatorAllowed = checkRole(['superadmin', 'admin', 'operator']);
export const ownerAllowed = checkRole(['superadmin', 'admin', 'operator', 'owner']);

// Premium plan check (superadmin always has access)
export const premiumOnly = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const user = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = user;
    if (user.role === 'superadmin' || user.plan === 'premium') return next();
    return res.status(403).json({ error: 'Esta función requiere el plan Premium.', code: 'PREMIUM_REQUIRED' });
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};
