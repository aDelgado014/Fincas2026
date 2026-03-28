# Memoria del Proyecto — AdminFincas MVP

## Estado actual (20 marzo 2026)

### Lo que está implementado

**Módulos principales**
- Dashboard con hero de deuda (top 5 comunidades por deuda)
- Comunidades con badge `#ID` de 3 dígitos
- Detalle de comunidad con campo cuota mensual editable por unidad
- Importación con OCR y tab "Remesas" (XLS/SEPA)
- Deuda, Morosidad, Presupuesto
- Conciliación bancaria con banner de advertencia y botón "Guardar asignación manual"
- Incidencias, Actas, Calendario, Comunicaciones
- Auditoría con informe anual (selector año/comunidad, descarga Excel)
- Panel Administrador de Fincas (`/admin-fincas`): honorarios, deudores, plantillas, exportar/importar BD

**Módulos premium**
- `/premium/legal` — generador de escritos legales con IA
- `/premium/convocatorias` — convocatorias + certificado de deuda con IA
- `/premium/reservas` — zonas comunes y calendario de reservas

**Backend**
- 25 archivos de rutas en `backend/api/`
- 26 servicios en `backend/services/`
- API admin-fincas: `GET /api/admin-fincas/summary`, `GET /api/admin-fincas/export-db`
- AI service con 16 tools incluyendo `answer_legal_question`

**Auth**
- JWT puro (sin Firebase)
- Superadmin: `admin@bluecrabai.es` / `0000`
- Login: `POST /api/auth/login` → token en localStorage

**DB**
- Auto-migración al arrancar via `migrate()` en `backend/db/index.ts`
- Migrations en `drizzle/0000_charming_night_thrasher.sql`
- Campos nuevos: `communities.displayId`, `communities.adminFeeRate`, `communities.adminFeeFixed`, `units.monthlyFee`

---

## Decisiones técnicas importantes

| Decisión | Razón |
|----------|-------|
| `@` apunta a la raíz del proyecto, NO a `src/` | Configurado en `vite.config.ts`. shadcn está en `components/ui/` (raíz); componentes de la app en `src/components/`. Error habitual: usar `@/components/` para componentes de la app. |
| Auto-migración en vez de `drizzle-kit push` | `push` falla si las tablas ya existen. `migrate()` es idempotente. |
| `npm run dev` = servidor Express + Vite en el mismo proceso | No hay dos procesos separados. `tsx server.ts` inicia todo. |
| Sin Firebase | Eliminado por no estar en package.json. Auth es JWT propio. |

---

## Pendiente / Ideas futuras

- [ ] Implementar `POST /api/admin-fincas/import-db` (restaurar BD desde JSON)
- [ ] Firma electrónica real (actualmente placeholder en PremiumLegal)
- [ ] URL pública `/owner/reservas` para propietarios
- [ ] Notificaciones push (service worker ya configurado con PWA)
- [ ] Tests de integración para rutas API principales
