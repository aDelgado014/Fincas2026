# AdminFincas MVP

AdminFincas es una plataforma moderna para la gestión eficiente de comunidades de propietarios, potenciada por IA y diseñada para la escalabilidad.

---

## Estado de Implementación (Acta 25 de marzo de 2026)

> Leyenda: ✅ Implementado · ⚠️ Parcial / pendiente de mejora · ❌ Pendiente de implementar

### Dashboard Principal

| Funcionalidad | Estado | Notas |
|---|---|---|
| Incidencias por comunidad con filtro | ✅ | `IncidentDashboardList` + Select por comunidad |
| Apertura y cierre de incidencias desde dashboard | ✅ | Botones "Resolver" / "Reabrir" por tarjeta |
| Ranking de comunidades por deuda pendiente | ✅ | Widget `debtHero` (top 5) + `ranking` lateral |
| Historial de últimas actividades | ✅ | Widget `activities`; fallback a ratio de cobro si no hay logs |
| Accesos directos (Actas, Documentos, Chatbot) | ✅ | `ShortcutCard` × 3 en widget `shortcuts` |
| Dashboard modular y configurable por usuario | ✅ | 9 widgets con toggle persistido en `localStorage` |
| Lista de tareas pendientes visible en dashboard | ✅ | `TaskBoard` integrado como widget `tasks` |
| Formulario de nueva incidencia rápida | ✅ | Widget `quickIncident` con select de comunidad + textarea |

### Gestión Económica

| Funcionalidad | Estado | Notas |
|---|---|---|
| Cobro de cuotas y generación de remesas bancarias | ✅ | `Import.tsx` — tab de remesas con carga de fichero |
| Carga de extractos bancarios PDF | ✅ | `/api/import/parse-pdf` con OCR + IA |
| Carga de extractos Excel / CSV | ✅ | `/api/import/parse-xls` |
| Gestión de deuda por propietario | ✅ | `Debt.tsx` con filtros y tabla detallada |
| Panel de morosidad con aging buckets | ✅ | `Morosidad.tsx` — gráfico + top deudores |
| Botón imprimir en morosidad | ✅ | `window.print()` en `Morosidad.tsx` |
| Hojas de gastos por comunidad con selección de fecha | ✅ | `Expenses.tsx` con `startDate` / `endDate` |
| Exportar informe global (Excel) | ✅ | `/api/export-excel` desde Dashboard |
| Certificado de deuda | ⚠️ | En `PremiumConvocatorias.tsx`; pendiente mover acceso también a Gestión Económica |
| Botón imprimir en listado de Deuda | ⚠️ | Implementado en Morosidad; pendiente en `Debt.tsx` |

### Comunicaciones

| Funcionalidad | Estado | Notas |
|---|---|---|
| Envío de mensajes por email | ✅ | Resend API; funcional |
| Envío por WhatsApp | ⚠️ | Canal en UI; envío simulado — requiere configurar API real |
| Envío por SMS | ⚠️ | Canal en UI; envío simulado — requiere configurar API real |
| Registro histórico (fecha, destinatario, canal) | ✅ | `Communications.tsx` carga historial de `/api/communications` |
| Recordatorios automáticos a deudores | ✅ | `CommunicationsService.sendDebtReminder()` disponible |

### Actas de Juntas

| Funcionalidad | Estado | Notas |
|---|---|---|
| Selección de comunidad y fecha | ✅ | `Minutes.tsx` |
| Carga automática del listado de propietarios | ✅ | `loadCommunityOwners()` → `/api/communities/:id/units-full` |
| Marcado de asistencia: presente / ausente / representado | ✅ | Tres botones por asistente |
| Añadir puntos del orden del día | ✅ | Lista dinámica con debate + acuerdo por punto |
| Generar acta provisional con IA | ✅ | `/api/minutes/generate` |
| Historial de actas generadas | ✅ | Últimas 5 actas con acceso directo al contenido |
| Sincronización de actas con Notion | ✅ | `/api/minutes/:id/sync-notion` |
| Firma digital (certificado FNMT) | ⚠️ | UI presente; botón deshabilitado — pendiente integración real |
| Repositorio de actas antiguas (escaneos/fotos) | ❌ | Pendiente — solo se muestran actas generadas en la app |

### Documentos Legales y Plantillas

| Funcionalidad | Estado | Notas |
|---|---|---|
| Carta de reclamación de deuda | ✅ | `PremiumLegal.tsx` |
| Requerimiento de pago | ✅ | `PremiumLegal.tsx` |
| Comunicado a propietarios morosos | ✅ | `PremiumLegal.tsx` |
| Escrito a administración pública | ✅ | `PremiumLegal.tsx` |
| Recurso ante junta directiva | ✅ | `PremiumLegal.tsx` |
| Escrito para registro de la propiedad | ❌ | Pendiente añadir como plantilla |
| Impugnación de acuerdo de junta | ❌ | Pendiente añadir como plantilla |
| Denuncia por ruido / solicitudes | ❌ | Pendiente añadir como plantilla |
| Convocatorias de juntas | ✅ | `PremiumConvocatorias.tsx` |
| Certificado de deuda (con firma administrador) | ✅ | `PremiumConvocatorias.tsx` — sección independiente |

### Chatbot con IA

| Funcionalidad | Estado | Notas |
|---|---|---|
| Responde preguntas legales y operativas | ✅ | `Chatbot.tsx` → `/api/ai/chat` (Groq Llama 3.3 70B, 16 herramientas) |
| Acceso a datos de comunidades | ✅ | Herramientas de IA con acceso a DB |
| Consulta de extractos y movimientos bancarios | ⚠️ | Posible vía herramientas IA; no hay herramienta específica de extractos cargados |
| Acceso desde dashboard | ✅ | ShortcutCard "Chatbot de Consultas" → `/chatbot` |

### Reserva de Instalaciones

| Funcionalidad | Estado | Notas |
|---|---|---|
| UI de reserva (pádel, piscina, sala, gimnasio) | ✅ | `PremiumReservas.tsx` con estado y aforo |
| Backend de reservas | ❌ | Pendiente — solo UI estática |

### Mejoras de UX

| Mejora | Estado | Notas |
|---|---|---|
| Dashboard modular y configurable | ✅ | 9 widgets con toggle y persistencia |
| Lista de tareas e incidencias en dashboard | ✅ | Confirmado e implementado |
| Tamaño de fuente ajustable | ✅ | `Settings.tsx` — variable CSS `--app-font-size` persistida en `localStorage` |
| Botón imprimir en morosidad | ✅ | `Printer` + `window.print()` en `Morosidad.tsx` |
| Modo oscuro (fondo gris oscuro) | ❌ | Pendiente — sin toggle implementado |
| Eliminar etiqueta "con IA" de botones visibles | ⚠️ | Aparece en `PremiumConvocatorias.tsx` y `CommunityOnboarding.tsx` |
| Mover acceso a "Certificado de deuda" a Gestión Económica | ⚠️ | Pendiente añadir enlace en `Debt.tsx` |
| Repositorio de actas anteriores (escaneos/fotos) | ❌ | Pendiente |
| Perfil de presidente de comunidad (acceso limitado) | ❌ | No existe rol `president` en schema — pendiente diseño |

### Gestión de Remesas y Devoluciones (Aspectos Técnicos)

| Aspecto | Estado | Notas |
|---|---|---|
| Detección automática de líneas de devolución en extracto | ✅ | `bank.service.ts` — regex `/DEVOLUCION\|RETORNO\|IMPAGADO\|DEV\./i` |
| Notificación interna al detectar devolución | ✅ | Inserta en tabla `notifications` con tipo `warning` |
| Email automático al administrador al detectar devolución | ⚠️ | Notificación en DB; envío de email pendiente de conectar |
| Registro de devolución + recargo bancario (3 €) | ✅ | `bank.service.ts` → `resolveReturn()` crea cargo con importe + 3 € |
| Vinculación de devolución a propietario/unidad en UI | ⚠️ | Endpoint disponible; UI usa ID mock — pendiente modal de selección real |
| Integración API bancaria directa (remesas automáticas) | ❌ | Pospuesto — complejidad de la doble autenticación bancaria |

---

## Actualización 28 marzo 2026 — Plan de Mejoras Completo

### Bugs corregidos

| Archivo | Problema | Solución |
|---------|----------|----------|
| `Minutes.tsx` L44 | URL como regex: `/api/communities/` | Template literal: `` `/api/communities/${id}/units-full` `` |
| `Minutes.tsx` L75 | URL como regex: `/api/minutes/` | Template literal: `` `/api/minutes/${minute.id}/sync-notion` `` |
| `Expenses.tsx` | `communities.map is not a function` | Guard `Array.isArray(data) ? data : []` |
| `Audit.tsx` | Mismo bug de array | Guard en `setCommunities` |

### Cambios por pestaña

| Pestaña | Cambio |
|---------|--------|
| **Comunidades** | Botón "Nueva Comunidad" conectado a `/comunidades/nueva` |
| **Deuda** | Título "Deuda & Morosidad" → "Deuda". Botón "Enviar Recordatorios" ahora itera deudores filtrados y llama a `/api/communications/remind-debt/:id` |
| **Morosidad** | Título "Dashboard de Morosidad" → "Morosidad" |
| **Presupuestos** | Modal de nueva partida permite adjuntar documento/imagen (sube a `/api/documents/upload`) |
| **Gastos** | Botón "Registrar Gasto Manual" abre modal real con formulario + carga de factura/imagen |
| **Conciliación** | Texto del botón: "Procesar con Groq AI" → "Procesar" |
| **Bancos** | Título "Conciliación Bancaria" → "Banco". Botón "Exportar Pendientes" genera CSV real |
| **Incidencias** | Botón renombrado (sin "(Prueba)"). Abre modal con selector comunidad + título + descripción + prioridad |
| **Calendario** | Botón "Nuevo Evento" con modal: título, fecha, tipo, comunidad, descripción. POST a `/api/calendar/events` |
| **Comunicaciones** | Canal "Llamada IA" añadido (preparado para VAPI/Twilio). Panel de estado de servicios ampliado |
| **Auditoría** | Guard en `setCommunities` para selector operativo |
| **Premium Legal** | Sección "Mis Plantillas": sube PDF/DOC/TXT, la IA revisa errores legales automáticamente |
| **Premium Convocatorias** | Sección para cargar plantillas de estilo propio como referencia para la IA |
| **Premium Reservas** | Modal "Nueva Instalación" operativo. Sección "Integración App Móvil" con estado de API REST y webhooks |
| **Panel Administrador** | Secciones colapsables con botón toggle y animación |
| **Perfil** | Avatar de usuario con subida de foto. Nota sobre cambio de rol. Sección crear nuevo usuario con foto + contraseña obligatoria |
| **Configuración** | Panel Superusuario (solo superadmin): gestión usuarios, recuperación contraseñas, feature flags por módulo, backup completo |

### Endpoints backend pendientes de implementar

- `POST /api/expenses` — aceptar FormData con archivo adjunto
- `POST /api/calendar/events` — crear evento manual
- `POST /api/users/admin-reset-password` — reset de contraseña por superadmin
- `POST /api/users/avatar` — subir foto de perfil
- Proveedor de llamadas IA (VAPI/Twilio) en Settings → Integraciones

---

## Cambios Recientes (Acta 18 marzo)

### Nuevos módulos

- **Panel Administrador de Fincas** (`/admin-fincas`): honorarios por comunidad, deudores, plantillas y exportar/importar base de datos.
- **Premium Legal** (`/premium/legal`): generador de escritos y modelos legales con IA (reclamaciones, requerimientos, comunicados).
- **Premium Convocatorias** (`/premium/convocatorias`): generación de convocatorias ordinarias/extraordinarias y certificados de deuda con IA.
- **Premium Reservas** (`/premium/reservas`): gestión de zonas comunes con calendario semanal y formulario de reserva.

### Mejoras por módulo

**Dashboard**
- Sección hero al inicio con las 5 comunidades con mayor deuda (tarjetas visuales con nombre e importe destacado).

**Conciliación bancaria**
- Banner de alerta visible con el número de movimientos sin clasificar automáticamente.
- Botón "Guardar asignación manual" por fila en estado de advertencia.

**Auditoría**
- Nueva sección "Informe Anual": selector de año y comunidad, descarga Excel del informe.

**Importación**
- Nuevo tab "Remesas": carga de archivo de remesas (XLS/SEPA), previsualización y aceptación.

**Comunidades**
- Badge `#ID` (3 dígitos) visible junto al nombre de cada comunidad.
- Campo "Cuota mensual" editable por unidad en el detalle de comunidad.

**Asistente IA**
- Nuevo tool `answer_legal_question`: responde dudas legales sobre la Ley de Propiedad Horizontal, estatutos, convocatorias y derechos de propietarios.

**Autenticación**
- Login reemplazado: eliminada dependencia de Firebase, ahora usa el sistema JWT propio del backend.
- `useAuth` reescrito sin Firebase.

**Navegación**
- Submenú desplegable "Premium" en el sidebar (Legal, Convocatorias, Reservas).
- Nuevo item "Admin Fincas" en la barra lateral.

### Esquema de base de datos

Nuevos campos añadidos:
- `communities.displayId` — identificador de 3 dígitos visible
- `communities.adminFeeRate` — porcentaje de honorarios del administrador
- `communities.adminFeeFixed` — cuota fija de honorarios
- `units.monthlyFee` — cuota mensual por piso

### Correcciones anteriores

**Seguridad**
- Corregido el orden de los middlewares en `server.ts` (bug que impedía el login).
- Middleware CORS configurable con `ALLOWED_ORIGINS`.
- El servidor falla en arranque si `JWT_SECRET` no está configurado en producción.
- Eliminada la `GEMINI_API_KEY` del bundle del cliente.
- Corregida vulnerabilidad de path traversal en subidas de archivos (`storage.service.ts`).
- Operaciones de escritura de archivos cambiadas de síncronas a asíncronas.

**Rendimiento**
- Eliminado el problema N+1 en `CommunityService.getUnitsFull()`.

---

## Asistente IA (Chatbot)

### Herramientas disponibles (16 tools)

| Herramienta | Descripción |
|-------------|-------------|
| `list_communities` | Comunidades activas con unidades y deuda total |
| `get_debt_report` | Cargos pendientes por unidad y propietario |
| `get_financial_summary` | Total cargado, cobrado y pendiente de una comunidad |
| `list_incidents` | Incidencias filtrables por estado |
| `create_incident` | Crear una incidencia con prioridad |
| `get_owner_details` | Buscar propietario por nombre o email |
| `get_payment_history` | Historial de pagos recientes |
| `get_minutes` | Actas de asambleas filtrables por comunidad |
| `mark_charge_paid` | Marcar un cargo como pagado |
| `get_reconciliation_status` | Transacciones bancarias pendientes de conciliar |
| `send_community_notice` | Enviar aviso por email a todos los propietarios de una comunidad |
| `generate_excel_report` | Excel de comunidades, deudas, propietarios, cargos, pagos o incidencias |
| `generate_circular` | Circular formal en HTML lista para imprimir/exportar a PDF |
| `create_charge` | Crear cargo pendiente para una unidad |
| `navigate_to` | Navegar a cualquier sección de la app |
| `answer_legal_question` | Responder dudas legales sobre comunidades de propietarios |

### UX del chat

- **Efecto typewriter**: las respuestas se escriben carácter a carácter.
- **Historial persistente**: se guarda en `localStorage` y se recupera al reabrir.
- **Badge de notificaciones**: contador de mensajes nuevos cuando el chat está cerrado.
- **Sugerencias contextuales**: cambian según la sección de la app donde estés.
- **Timestamps**: hora en cada mensaje.
- **Copiar mensaje**: botón al hacer hover sobre respuestas del asistente.
- **Nueva conversación**: botón para resetear el chat.
- **Entrada de voz**: micrófono con Web Speech API en español.
- **Exportar conversación**: descarga el historial como `.txt`.
- **Tablas automáticas**: el markdown con `|` se renderiza como tabla HTML.
- **Ventana expandible**: botón para agrandar/reducir el chat.

---

## Arquitectura del Sistema

```
AdminFincas-MVP/
├── backend/
│   ├── api/          # Rutas REST por dominio (22 archivos)
│   ├── services/     # Lógica de negocio (incluye admin-fincas.service.ts)
│   ├── db/           # Drizzle ORM + schema SQLite/PostgreSQL
│   └── workers/      # Procesamiento asíncrono (stub BullMQ)
├── src/
│   ├── components/   # Componentes React (layout, analytics, common)
│   └── pages/
│       ├── premium/  # Módulos premium (Legal, Convocatorias, Reservas)
│       ├── owner/    # Portal del propietario
│       └── ...       # Páginas admin
├── server.ts         # Entrada Express + Vite middleware
└── vite.config.ts    # Build frontend (PWA)
```

## Módulos y Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard con hero de deuda, stats, gráfico y tablero Kanban |
| `/comunidades` | Listado de comunidades con ID visible |
| `/comunidades/:id` | Detalle con unidades, propietarios, financiero y cuota mensual |
| `/importar` | Importación OCR + tab Remesas |
| `/deuda` | Deuda pendiente con filtro por comunidad |
| `/morosidad` | Analítica avanzada de morosidad |
| `/presupuesto` | Presupuesto anual por comunidad |
| `/conciliacion` | Conciliación bancaria con alertas de no clasificados |
| `/incidencias` | Gestión de incidencias |
| `/actas` | Generación de actas con IA |
| `/calendario` | Calendario de eventos y vencimientos |
| `/comunicaciones` | Comunicaciones con historial de envíos |
| `/auditoria` | Log de auditoría + informe anual |
| `/admin-fincas` | Panel exclusivo del administrador de fincas |
| `/premium/legal` | Escritos y modelos legales con IA |
| `/premium/convocatorias` | Convocatorias y certificados de deuda |
| `/premium/reservas` | Reservas de zonas comunes |
| `/owner` | Portal del propietario (recibos, incidencias, documentos) |

## Modelo Financiero

- **Charges (Cargos)**: obligaciones por unidad (cuotas, derramas).
- **Payments (Pagos)**: abonos vinculados a cargos específicos.
- **BankTransactions**: extractos bancarios importados para conciliación.

## Seguridad y Roles

- **JWT** con expiración de 8h y rate limiting en login (10 intentos / 15 min por IP).
- **Roles**: `superadmin`, `admin`, `operator`, `owner`.
- **Bcrypt** (factor 12) para almacenamiento de contraseñas.
- **CORS** configurable con variable de entorno `ALLOWED_ORIGINS`.

## Integraciones Externas

| Servicio | Uso |
|----------|-----|
| **Groq** (Llama 3.3 70B) | Chatbot inteligente con tool-use + importación IA + generación de documentos |
| **Google Gemini** (1.5 Flash) | Análisis financiero predictivo |
| **Resend** | Envío de emails (avisos, recibos, convocatorias) |
| **Telegram Bot API** | Chatbot privado por administrador vía Telegram |
| **Notion** | Espejo de incidencias y documentos |
| **Supabase** | Almacenamiento en producción (PostgreSQL + Storage) |

## Stack Tecnológico

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + shadcn/UI + Framer Motion
- **Backend**: Node.js + Express 4 + TypeScript
- **Base de datos**: SQLite (dev) / PostgreSQL via Supabase (prod) + Drizzle ORM
- **PWA**: `vite-plugin-pwa`
- **Auth**: JWT manual con bcryptjs

## Instalación y Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
```

Variables requeridas en `.env`:

```env
JWT_SECRET=tu_clave_secreta_segura
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...        # Solo backend, NO exponer en frontend
RESEND_API_KEY=re_...
NOTION_API_KEY=secret_...     # Opcional
ALLOWED_ORIGINS=http://localhost:3000  # Producción: tu dominio
STORAGE_PROVIDER=local        # o 'supabase'
```

```bash
# 3. Iniciar en desarrollo
npm run dev

# 4. Build de producción
npm run build
```

## Variables de Entorno Completas

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `JWT_SECRET` | Sí (prod) | Clave secreta para firmar tokens JWT |
| `GROQ_API_KEY` | Sí | API key de Groq para el chatbot y generación de documentos |
| `GEMINI_API_KEY` | No | API key de Google Gemini para analítica |
| `RESEND_API_KEY` | No | API key de Resend para emails |
| `NOTION_API_KEY` | No | API key de Notion para sincronización |
| `ALLOWED_ORIGINS` | No | Orígenes CORS permitidos (por defecto `localhost:3000`) |
| `STORAGE_PROVIDER` | No | `local` (defecto) o `supabase` |

---

## Chatbot Telegram — FINCA

Cada administrador puede conectar su propio bot privado de Telegram al sistema. El bot tiene acceso completo a los datos de sus comunidades a través de las 16 herramientas de FINCA.

### Configuración

1. Abre Telegram y busca **@BotFather**
2. Escribe `/newbot` y sigue las instrucciones
3. Copia el token que te proporciona BotFather
4. En AdminFincas → **Configuración** → sección "Chatbot Telegram"
5. Pega el token y pulsa **Conectar Bot**
6. Abre tu bot en Telegram y escribe `/start`

### Arquitectura

```
Usuario → Telegram → POST /api/telegram/webhook/:botId
                          ↓
                   ai.service.ts (16 tools reales)
                          ↓
                   SQLite / PostgreSQL
                          ↓
                   Respuesta → Telegram → Usuario
```

### Tablas de base de datos

| Tabla | Descripción |
|-------|-------------|
| `telegram_bots` | Un registro por bot conectado (token, usuario, comunidad) |
| `telegram_sessions` | Historial de conversación por chat_id (últimos 20 mensajes) |

### Comandos del bot

| Comando | Descripción |
|---------|-------------|
| `/start` | Bienvenida e inicio de sesión |
| `/reset` | Limpiar historial de conversación |
| `/ayuda` | Lista de capacidades y ejemplos |

### Archivos clave

| Archivo | Descripción |
|---------|-------------|
| `backend/services/telegram.service.ts` | Lógica principal: webhook, sesiones, comandos |
| `backend/api/telegram.routes.ts` | Endpoints: webhook + CRUD de bots |
| `src/pages/Settings.tsx` | Panel de configuración visual con instrucciones |

### Base de conocimiento

Ver `docs/FINCA_knowledge_base.md` para la documentación completa del asistente: modelo de datos, herramientas disponibles, flujos de trabajo y base legal.

---

## Actualización 28 Marzo 2026

### Correcciones de bugs
- `Minutes.tsx`: Fixed 2 URLs con sintaxis de regex inválida → template literals
- `Expenses.tsx` / `Audit.tsx`: Guard `Array.isArray()` en respuestas de API
- `Settings.tsx`: Eliminado `</div>` extra que causaba error JSX

### Nuevas funcionalidades
| Página | Cambio |
|--------|--------|
| `Debt.tsx` | Título "Deuda" + botón "Enviar Recordatorios" funcional |
| `Morosidad.tsx` | Título "Morosidad" (sin "Dashboard") |
| `Reconciliation.tsx` | Botón renombrado a "Procesar" |
| `BankConciliation.tsx` | Título "Banco" + exportar CSV pendientes |
| `Communities.tsx` | Botón "Nueva Comunidad" navega correctamente |
| `Incidents.tsx` | Modal real con POST a `/api/incidents` |
| `Presupuesto.tsx` | Upload de fichero en modal de nuevo presupuesto |
| `Calendario.tsx` | Modal "Nuevo Evento" con selector de comunidad |
| `Communications.tsx` | Canal "Llamada IA" preparado |
| `PremiumReservas.tsx` | Modal "Nueva Instalación" + card integración móvil |
| `PremiumLegal.tsx` | Upload de plantillas con revisión legal por IA |
| `PremiumConvocatorias.tsx` | Upload de plantillas de estilo |
| `AdminProfile.tsx` | Avatar, creación de usuarios, campo contraseña |
| `Settings.tsx` | Panel superusuario + **Chatbot Telegram** |
| `AdminFincasPanel.tsx` | Menús colapsables |

### Repositorio GitHub
- **URL**: https://github.com/aDelgado014/Fincas2026
- **Rama**: `main`

---

*Desarrollado por BluecrabAI + Antigravity para optimizar la gestión de fincas.*
