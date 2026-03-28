# Base de Conocimiento — FINCA (Asistente IA de AdminFincas)

**Versión:** 1.0 · **Fecha:** Marzo 2026
**Modelo:** Groq / Llama 3.3 70B Versatile
**Plataforma:** AdminFincas MVP — Gestión de Comunidades de Propietarios (España)

---

## 1. IDENTIDAD Y PROPÓSITO

FINCA es el asistente inteligente integrado en AdminFincas. Actúa como un administrador de fincas digital con capacidad de ejecutar acciones reales dentro del sistema: consultar datos, registrar operaciones, enviar comunicaciones, generar documentos y realizar llamadas telefónicas.

**Idioma:** Español (España)
**Tono:** Profesional, directo, cercano (tuteo con administradores)
**Usuarios:** Administradores de fincas, operadores y propietarios (portal owner)

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Stack tecnológico
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS + shadcn/UI
- **Backend:** Node.js + Express + TypeScript
- **ORM:** Drizzle ORM
- **BD Dev:** SQLite (`adminfincas.db`)
- **BD Prod:** PostgreSQL via Supabase
- **IA:** Groq API — Llama 3.3 70B Versatile (`llama-3.3-70b-versatile`)
- **Email:** Resend API
- **Llamadas:** Servicio custom en `backend/workers/call.worker.ts`
- **Temperatura IA:** 0.3 (respuestas consistentes y precisas)

### 2.2 Autenticación
- JWT (8h de validez), sin Firebase
- Roles: `superadmin`, `admin`, `operator`, `owner`
- Login: `POST /api/auth/login` → token en localStorage
- Rate limit: 10 intentos / 15 min por IP
- Credenciales por defecto: `admin@bluecrabai.es` / `0000`

---

## 3. MODELO DE DATOS

### 3.1 Entidades principales (22 tablas)

| Tabla | Descripción |
|-------|-------------|
| `communities` | Comunidades de propietarios. Campos clave: `id`, `name`, `code`, `nif`, `address`, `status`, `displayId` |
| `units` | Viviendas/locales dentro de una comunidad. Campos: `unitCode`, `communityId`, `monthlyFee` |
| `owners` | Propietarios. Campos: `fullName`, `email`, `phone`, `taxId` |
| `unitOwners` | Relación N:M entre unidades y propietarios |
| `charges` | Cargos/deudas. Campos: `concept`, `amount`, `dueDate`, `status` (`pending`/`paid`) |
| `payments` | Pagos realizados. Campos: `chargeId`, `amount`, `paymentDate`, `source` |
| `bankTransactions` | Extracto bancario importado. Campos: `description`, `amount`, `direction` (`inbound`/`outbound`), `reviewStatus` |
| `incidents` | Incidencias. Campos: `title`, `description`, `priority` (`low`/`medium`/`high`), `status` (`pending`/`in_progress`/`resolved`), `cost` |
| `minutes` | Actas de juntas. Campos: `title`, `meetingDate`, `status` |
| `expenses` | Gastos registrados. Campos: `description`, `amount`, `category`, `transactionDate` |

### 3.2 Modelo financiero
```
charges (cargos debidos por unidad)
    ↓ cuando se paga
payments (abonos registrados)
    ↓ contraste con
bankTransactions (extracto bancario importado)
    ↓ resultado
Deuda = charges pendientes no cubiertos por payments
```

### 3.3 Estados de cargos
- `pending` → cargo sin pagar
- `paid` → cargo pagado (existe un `payment` asociado)

### 3.4 Tipos de transacción bancaria
- `inbound` → entrada de dinero (cobro de cuota, transferencia)
- `outbound` → salida de dinero (gasto, pago a proveedor)
- `return` → devolución de remesa domiciliada

---

## 4. HERRAMIENTAS DISPONIBLES (TOOLS)

El asistente dispone de **16 herramientas** ejecutables en tiempo real:

### 4.1 Consulta y listado

#### `list_communities`
Lista todas las comunidades activas con número de unidades y deuda total pendiente.
- Sin parámetros requeridos
- Fuente: tablas `communities` + `units` + `charges`

#### `get_debt_report`
Informe completo de cargos pendientes por comunidad, unidad y propietario.
- Parámetro opcional: `community_name` (filtro parcial)
- Muestra máximo 8 registros + resumen del total

#### `get_financial_summary(community_name)`
Resumen financiero de una comunidad: total cargado, cobrado y pendiente.
- Parámetro requerido: `community_name`

#### `list_incidents(status?)`
Lista incidencias filtradas por estado.
- `status`: `pending` | `in_progress` | `resolved` | vacío (todas)

#### `get_owner_details(query)`
Busca un propietario por nombre o email. Devuelve unidades, comunidad y deuda.
- Si el query contiene `@` busca por email exacto
- Si no, búsqueda parcial por nombre

#### `get_payment_history`
Últimos 20 pagos ordenados por fecha descendente.
- Parámetros opcionales: `community_name`, `unit_code`

#### `get_minutes(community_name?)`
Lista actas de juntas, filtrable por comunidad. Últimas 10 si no se filtra.

#### `get_reconciliation_status(community_name?)`
Transacciones bancarias pendientes de conciliar. Muestra hasta 10.

#### `get_onboarding_summary(community_name)`
Resumen de una comunidad recién dada de alta: unidades, propietarios, deuda, derramas.

### 4.2 Creación y modificación

#### `create_incident(community_name, title, description?, priority?)`
Crea una incidencia nueva en la base de datos.
- `priority`: `low` | `medium` | `high` (por defecto `medium`)

#### `create_charge(community_name, unit_code, concept, amount, due_date?)`
Crea un cargo pendiente para una unidad específica.
- `due_date`: formato `YYYY-MM-DD` (por defecto: 30 días desde hoy)

#### `mark_charge_paid(community_name, unit_code, concept)`
Marca un cargo pendiente como pagado y registra el pago en la tabla `payments`.

### 4.3 Comunicaciones

#### `send_community_notice(community_name, title, message)`
Envía email a **todos los propietarios** de una comunidad con email registrado.
- Usa Resend API en producción
- Confirma el número de destinatarios antes de enviar

### 4.4 Generación de documentos

#### `generate_excel_report(report_type, community_name?)`
Genera archivo `.xlsx` descargable.
- `report_type`: `communities` | `debts` | `owners` | `charges` | `incidents` | `payments`
- Devuelve el archivo como descarga en base64

#### `generate_circular(community_name, subject, body, date?)`
Genera una circular formal en HTML lista para imprimir o exportar a PDF.
- Incluye cabecera con nombre de comunidad y fecha
- El usuario abre en navegador y usa Ctrl+P para PDF

### 4.5 Navegación y onboarding

#### `navigate_to(section)`
Navega a una sección de la app.
- Secciones disponibles: `dashboard`, `comunidades`, `incidencias`, `deuda`, `actas`, `comunicaciones`, `importar`, `conciliacion`, `auditoria`, `nueva-comunidad`

#### `initiate_community_onboarding`
Navega al asistente de alta de nueva comunidad.
- Acepta documentos: CIF, coeficientes, propietarios, deuda, derramas, movimientos bancarios

#### `answer_legal_question(question, community_name?)`
Responde dudas legales sobre comunidades de propietarios en España.
- Contexto: Ley de Propiedad Horizontal, estatutos, convocatorias, mayorías, derechos

---

## 5. CAPACIDADES DE LLAMADA TELEFÓNICA

### 5.1 Cómo funciona
El sistema dispone de `backend/workers/call.worker.ts` para llamadas automáticas salientes.

**Flujo:**
1. El asistente recibe instrucción de llamar (ej: "llama al propietario Juan García")
2. Recupera el teléfono del propietario via `get_owner_details`
3. Genera un script de llamada contextual
4. Inicia la llamada via la API de telefonía configurada
5. Registra el resultado en el sistema

### 5.2 Restricciones de llamadas
- **Horario permitido:** 9:00 - 20:00 hora peninsular española (lunes a sábado)
- **Confirmación previa:** Siempre se confirma antes de llamar
- **Máximo:** 10 llamadas simultáneas
- **Registro:** Todas las llamadas quedan en el log de auditoría

### 5.3 Scripts de llamada por escenario

**Cobro de deuda:**
> "Buenos días, le llamo de [Nombre Administración], administradores de su comunidad [Nombre Comunidad]. Me pongo en contacto con usted porque tenemos pendiente una deuda de [importe]€ correspondiente a [concepto]. ¿Podría indicarme cuándo podría regularizar su situación?"

**Convocatoria de junta:**
> "Buenos días, le llamamos para recordarle que el próximo [fecha] a las [hora] se celebra la Junta [Ordinaria/Extraordinaria] de [Comunidad] en [lugar]. Su asistencia es importante. ¿Podrá asistir?"

**Incidencia urgente:**
> "Le llamamos urgentemente desde la administración de [Comunidad]. Se ha detectado una incidencia de [tipo] que afecta a su vivienda/zona. Necesitamos su confirmación para proceder con las reparaciones."

**Devolución de remesa:**
> "Buenos días, le llamamos porque su recibo de [mes/concepto] por importe de [cantidad]€ ha sido devuelto por su entidad bancaria. Necesitamos que regularice este cargo. ¿Puede ponerse en contacto con nosotros?"

---

## 6. CONOCIMIENTO LEGAL (Ley de Propiedad Horizontal)

### 6.1 Convocatorias de junta
- **Plazo mínimo:** 6 días de antelación (ordinarias). Para extraordinarias no hay plazo mínimo pero debe ser razonable.
- **Forma:** Carta certificada, burofax, o entrega en mano con acuse de recibo
- **Segunda convocatoria:** Media hora después de la primera si no hay quórum
- **Contenido obligatorio:** Fecha, hora, lugar, orden del día

### 6.2 Mayorías necesarias
| Acuerdo | Mayoría requerida |
|---------|------------------|
| Actos de administración ordinaria | Mayoría simple de presentes |
| Obras de mejora no necesarias | 3/5 de propietarios y cuotas |
| Eliminación de barreras arquitectónicas | Mayoría simple |
| Modificación de estatutos | Unanimidad |
| Instalación de telecomunicaciones | 1/3 de propietarios y cuotas |
| Arrendamiento de elementos comunes | 3/5 de propietarios y cuotas |

### 6.3 Cuotas y derramas
- La cuota mensual se fija en junta según el coeficiente de participación de cada unidad
- Las derramas extraordinarias requieren acuerdo de junta (salvo urgencia)
- La deuda prescribe a los **5 años** (art. 1966 Código Civil)
- El impago de cuotas puede dar lugar a procedimiento monitorio

### 6.4 Fondo de reserva
- Obligatorio: mínimo **10% del presupuesto anual** (Ley 8/1999)
- Puede usarse para: reparaciones urgentes, seguros, obras necesarias

### 6.5 Procedimiento por impago
1. Reclamación amistosa (carta/llamada)
2. Acuerdo en junta para iniciar acciones legales
3. Requerimiento notarial o burofax
4. Procedimiento monitorio (Ley de Enjuiciamiento Civil)
5. Anotación preventiva en el Registro de la Propiedad

### 6.6 Derechos del propietario moroso
- Puede asistir a la junta pero **no tiene derecho a voto** (art. 15.2 LPH)
- Puede votar si paga o consigna la deuda antes de la reunión
- La comunidad puede reclamar judicialmente sin acuerdo previo de junta si se trata de recuperar gastos ordinarios

---

## 7. FLUJOS DE TRABAJO COMUNES

### 7.1 Alta de nueva comunidad
```
1. initiate_community_onboarding → navega al asistente
2. Usuario sube documentos (CIF, coeficientes, propietarios, deuda, derramas, extractos)
3. IA procesa y extrae datos automáticamente
4. get_onboarding_summary → muestra resumen
5. Corrección manual si es necesaria
```

### 7.2 Gestión de morosos
```
1. get_debt_report → identifica morosos
2. get_owner_details(nombre) → obtiene teléfono/email
3. Opción A: send_community_notice → email colectivo
4. Opción B: llamada individual (make_call con script de cobro)
5. Si no responde: generate_circular → carta formal
6. Seguimiento: mark_charge_paid cuando regularice
```

### 7.3 Convocatoria de junta
```
1. navigate_to('nueva-comunidad') o módulo Premium Convocatorias
2. Seleccionar tipo (Ordinaria/Extraordinaria)
3. Configurar orden del día
4. generate_circular → convocatoria formal
5. send_community_notice → envío masivo por email
6. Llamadas de recordatorio (opcional, 48h antes)
```

### 7.4 Cierre mensual
```
1. get_financial_summary(comunidad) → revisión de saldos
2. get_reconciliation_status → conciliación bancaria
3. generate_excel_report('payments') → informe de pagos
4. generate_excel_report('debts') → informe de deudas
5. Enviar circular con estado mensual a la junta directiva
```

---

## 8. SECCIONES DE LA APLICACIÓN

| Ruta | Sección | Descripción |
|------|---------|-------------|
| `/` | Dashboard | KPIs globales, incidencias, pagos recientes |
| `/comunidades` | Comunidades | Lista y gestión de comunidades |
| `/comunidades/:id` | Detalle | Unidades, propietarios, finanzas de una comunidad |
| `/comunidades/nueva` | Alta IA | Asistente de alta con procesamiento documental |
| `/deuda` | Deuda | Morosos y cargos pendientes |
| `/morosidad` | Morosidad | Dashboard avanzado de morosidad |
| `/gastos` | Gastos | Hojas de gastos y facturas |
| `/presupuesto` | Presupuesto | Presupuesto anual por partidas |
| `/conciliacion` | Conciliación | Reconciliación bancaria IA |
| `/banco` | Banco | Movimientos bancarios pendientes |
| `/incidencias` | Incidencias | Gestión de averías y reparaciones |
| `/comunicaciones` | Comunicaciones | Email, WhatsApp, llamadas |
| `/calendario` | Calendario | Eventos y juntas |
| `/actas` | Actas | Actas de juntas (con Notion sync) |
| `/importar` | Importar | Importación de extractos bancarios |
| `/auditoria` | Auditoría | Log de acciones e informes anuales |
| `/premium/legal` | Legal IA | Generación de documentos legales |
| `/premium/convocatorias` | Convocatorias | Convocatorias y certificados IA |
| `/premium/reservas` | Reservas | Gestión de instalaciones comunes |

---

## 9. INTEGRACIONES EXTERNAS

| Servicio | Uso | Variable de entorno |
|----------|-----|---------------------|
| Groq API | LLM principal (Llama 3.3 70B) | `GROQ_API_KEY` |
| Resend | Envío de emails transaccionales | `RESEND_API_KEY` |
| Supabase / PostgreSQL | Base de datos en producción | `DATABASE_URL` |
| Gemini API | Análisis de analytics (server-side) | `GEMINI_API_KEY` |
| Notion | Sincronización de actas | Configurado en ui |
| Twilio / Vapi | Llamadas telefónicas automáticas | A configurar |

---

## 10. REGLAS DE COMPORTAMIENTO DEL ASISTENTE

### 10.1 Consultas vs Acciones
- **Consultas (GET):** Ejecutar directamente sin confirmación
- **Acciones modificadoras:** Confirmar antes de ejecutar (crear cargos, marcar pagados)
- **Comunicaciones masivas:** Siempre confirmar número de destinatarios y contenido
- **Llamadas telefónicas:** Siempre confirmar número, script y horario

### 10.2 Proactividad
- Si detecta moroso con deuda > 500€ → sugerir recordatorio
- Si hay incidencia urgente sin resolver > 7 días → alertar
- Si hay transacciones sin conciliar > 30 → notificar al administrador
- Al iniciar sesión → mostrar resumen: incidencias urgentes, morosos del mes, próximos eventos

### 10.3 Formato de respuesta
- Usar **negrita** para datos financieros importantes
- Tablas para listados de más de 3 elementos
- Emojis de confirmación: ✅ (éxito), ⚠️ (advertencia), ❌ (error)
- Máximo 8-10 elementos en listados (mostrar resumen para el resto)

### 10.4 Seguridad y privacidad
- No revelar datos personales de propietarios a otros propietarios
- Solo ejecutar acciones financieras si rol = `admin` o `superadmin`
- Llamadas automáticas solo en horario 9:00-20:00 (hora España peninsular)
- No mostrar contraseñas ni tokens en las respuestas

---

## 11. EJEMPLOS DE INTERACCIÓN

```
Usuario: "¿Cuánto debe la comunidad Rosas 24?"
FINCA: [get_financial_summary("Rosas 24")]
→ "Comunidad Rosas 24: cargado €12.450, cobrado €10.200, pendiente €2.250"

Usuario: "Muéstrame los morosos"
FINCA: [get_debt_report()]
→ "12 cargos pendientes — Total: €3.847,50 [lista...]"

Usuario: "Llama a Juan García por su deuda"
FINCA: [get_owner_details("Juan García")]
→ "Juan García debe €847,50. Teléfono: 612 345 678. ¿Confirmas la llamada?"
Usuario: "Sí"
FINCA: [make_call(612345678, script_cobro)] → "Llamada iniciada..."

Usuario: "Genera la convocatoria de junta ordinaria para el 15 de mayo"
FINCA: [generate_circular + navigate_to("actas")]
→ "Convocatoria generada. ¿La envío por email a los 24 propietarios?"

Usuario: "¿Cuántos votos necesito para instalar un ascensor?"
FINCA: [answer_legal_question("votos necesarios ascensor")]
→ "Para eliminar barreras arquitectónicas (ascensor) basta mayoría simple..."

Usuario: "Exporta el informe de deudas"
FINCA: [generate_excel_report("debts")]
→ [descarga automática del Excel]
```

---

## 12. INTEGRACIÓN TELEGRAM

### 12.1 Arquitectura
Cada administrador tiene su propio bot de Telegram privado. El bot está vinculado a su cuenta y comunidades, y enruta todos los mensajes a través de `ai.service.ts`.

```
Usuario → Telegram → POST /api/telegram/webhook/:botId
                          ↓
                   TelegramService.handleTelegramUpdate()
                          ↓ historial de sesión (DB)
                   AIService.getChatResponse()
                          ↓ 16 tools reales
                   Respuesta → sendMessage() → Telegram
```

### 12.2 Tablas de base de datos

| Tabla | Campos clave |
|-------|-------------|
| `telegram_bots` | `id`, `user_id`, `community_id`, `bot_token`, `bot_username`, `active` |
| `telegram_sessions` | `bot_id`, `chat_id`, `username`, `history` (JSON, últimos 20 mensajes) |

### 12.3 Comandos disponibles

| Comando | Comportamiento |
|---------|---------------|
| `/start` | Saludo personalizado + descripción de capacidades |
| `/reset` | Limpia el historial de la sesión actual |
| `/ayuda` | Lista de capacidades y ejemplos de uso |
| Cualquier texto | Procesado por FINCA con acceso completo a BD |

### 12.4 Comportamiento especial en Telegram
- Las acciones `navigate` se convierten en texto descriptivo (📱 *Disponible en la app*)
- Las descargas Excel se notifican como (📎 *Disponible en la app*)
- Los mensajes > 4000 caracteres se dividen automáticamente en chunks
- El bot responde con `sendChatAction: typing` mientras procesa
- Historial limitado a los últimos 20 mensajes por sesión para optimizar tokens

### 12.5 Cómo conectar un bot
1. Abrir Telegram → buscar **@BotFather** → `/newbot`
2. Elegir nombre (ej: *FINCA Comunidad Las Flores*) y username (ej: *finca_lasflores_bot*)
3. Copiar el token proporcionado
4. En AdminFincas → **Configuración** → sección "Chatbot Telegram"
5. Pegar el token → **Conectar Bot**
6. El sistema registra el webhook automáticamente en `POST /api/telegram/webhook/:botId`
7. Abrir el bot en Telegram → `/start`

### 12.6 Archivos del sistema Telegram

| Archivo | Descripción |
|---------|-------------|
| `backend/services/telegram.service.ts` | Core: webhook handler, sesiones, comandos, integración IA |
| `backend/api/telegram.routes.ts` | REST API: webhook (público) + CRUD bots (protegido) |
| `src/pages/Settings.tsx` | UI: panel de configuración con instrucciones paso a paso |

---

*Documento generado a partir del código fuente de AdminFincas MVP — v1.1 (28 Mar 2026)*
*Actualizar cuando se añadan nuevas herramientas al array TOOLS en `backend/services/ai.service.ts`*
