import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- Core Entities ---

export const communities = sqliteTable('communities', {
  id: text('id').primaryKey(),
  code: text('code').unique(),
  displayId: text('display_id').unique(),
  name: text('name').notNull(),
  nif: text('nif'),
  address: text('address'),
  bankAccountRef: text('bank_account_ref'),
  status: text('status').default('active'),
  adminFeeRate: real('admin_fee_rate').default(0),
  adminFeeFixed: real('admin_fee_fixed').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  unitCode: text('unit_code').notNull(),
  floor: text('floor'),
  door: text('door'),
  type: text('type').default('vivienda'),
  coefficient: real('coefficient').default(0),
  monthlyFee: real('monthly_fee').default(0),
  active: integer('active').default(1),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
});

export const owners = sqliteTable('owners', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
  mailingAddress: text('mailing_address'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
});

export const unitOwners = sqliteTable('unit_owners', {
  id: text('id').primaryKey(),
  unitId: text('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').references(() => owners.id, { onDelete: 'cascade' }),
  ownershipPercentage: real('ownership_percentage').default(100),
});

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
});

// --- Financial Model (New) ---

export const charges = sqliteTable('charges', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  unitId: text('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').references(() => owners.id, { onDelete: 'cascade' }),
  concept: text('concept').notNull(),
  amount: real('amount').notNull(),
  issueDate: text('issue_date').default(sql`CURRENT_TIMESTAMP`),
  dueDate: text('due_date').notNull(),
  status: text('status').default('pending'), // 'pending', 'paid', 'cancelled'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  chargeId: text('charge_id').references(() => charges.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').references(() => bankTransactions.id),
  amount: real('amount').notNull(),
  paymentDate: text('payment_date').default(sql`CURRENT_TIMESTAMP`),
  source: text('source'), // 'bank_transfer', 'cash', 'card'
  reference: text('reference'),
});

export const bankTransactions = sqliteTable('bank_transactions', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  transactionDate: text('transaction_date').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  direction: text('direction').notNull(), // 'inbound', 'outbound'
  category: text('category'),
  reviewStatus: text('review_status').default('pending'), // 'pending', 'matched', 'ignored'
});

// --- Automation & Tasks ---

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'send_email', 'call_reminder', 'generate_report'
  payload: text('payload'), // JSON string
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
  attempts: integer('attempts').default(0),
  scheduledAt: text('scheduled_at'),
  executedAt: text('executed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Voice Call system ---

export const callCampaigns = sqliteTable('call_campaigns', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id),
  type: text('type'),
  status: text('status').default('draft'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const calls = sqliteTable('calls', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').references(() => callCampaigns.id),
  ownerId: text('owner_id').references(() => owners.id),
  phone: text('phone').notNull(),
  status: text('status').default('pending'),
  result: text('result'),
  transcript: text('transcript'),
  audioUrl: text('audio_url'),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
});

export const callTasks = sqliteTable('call_tasks', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => owners.id),
  scheduledFor: text('scheduled_for').notNull(),
  status: text('status').default('pending'),
  attempts: integer('attempts').default(0),
});

// --- Audit & Logs ---

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // Link to users table once implemented
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  metadata: text('metadata'), // Extra context
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Supporting Entities ---

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  phone: text('phone'),
  email: text('email'),
  rating: real('rating').default(0),
});

export const incidents = sqliteTable('incidents', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('pending'),
  priority: text('priority').default('medium'),
  providerId: text('provider_id').references(() => providers.id),
  ownerId: text('owner_id').references(() => owners.id),
  unitId: text('unit_id').references(() => units.id),
  cost: real('cost'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const bankStatements = sqliteTable('bank_statements', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  uploadDate: text('upload_date').default(sql`CURRENT_TIMESTAMP`),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  category: text('category').default('others'), // 'minutes', 'statutes', 'financial', 'others'
  metadata: text('metadata'), // JSON string for storage info, etc.
  uploadDate: text('upload_date').default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'), // 'info', 'success', 'warning', 'error'
  read: integer('read').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Minutes (Actas) ---

export const minutes = sqliteTable('minutes', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  meetingDate: text('meeting_date').notNull(),
  attendees: text('attendees'), // JSON string: [{name, unit, present}]
  agendaItems: text('agenda_items'), // JSON string: [{topic, discussion, resolution}]
  content: text('content').notNull(), // Generated AI content (full acta text)
  generatedBy: text('generated_by').default('ai'), // 'ai' or 'manual'
  status: text('status').default('draft'), // 'draft', 'approved', 'signed'
  signatureToken: text('signature_token'),
  signedAt: text('signed_at'),
  signers: text('signers'), // JSON array of signer names
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Budgets (Presupuestos) ---

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  items: text('items'), // JSON: [{category, budgeted, spent}]
  totalAmount: real('total_amount').default(0),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Communications ---

export const communications = sqliteTable('communications', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(), // 'email', 'whatsapp', 'sms'
  subject: text('subject'),
  body: text('body').notNull(),
  recipientCount: integer('recipient_count').default(0),
  status: text('status').default('sent'), // 'sent', 'failed', 'pending'
  sentAt: text('sent_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Reservas de Zonas Comunes ---

export const facilities = sqliteTable('facilities', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').default('sala'), // 'padel', 'piscina', 'sala', 'gimnasio', 'bbq', 'otro'
  icon: text('icon').default('🏢'),
  description: text('description'),
  capacity: integer('capacity').default(10),
  pricePerSlot: real('price_per_slot').default(0),
  slotDuration: integer('slot_duration').default(60), // minutos
  openTime: text('open_time').default('09:00'),
  closeTime: text('close_time').default('22:00'),
  maxDaysAhead: integer('max_days_ahead').default(14),
  requiresApproval: integer('requires_approval').default(0), // 0=auto, 1=admin aprueba
  status: text('status').default('active'), // 'active', 'maintenance', 'disabled'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  facilityId: text('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  ownerId: text('owner_id').references(() => owners.id, { onDelete: 'set null' }),
  bookingDate: text('booking_date').notNull(), // 'YYYY-MM-DD'
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(),
  status: text('status').default('confirmed'), // 'pending', 'confirmed', 'cancelled'
  notes: text('notes'),
  qrCode: text('qr_code'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- Auth.js Tables (Simplified) ---

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  password: text('password'), // Will store hashed password
  role: text('role').default('operator'), // 'superadmin', 'admin', 'operator'
  emailVerified: text('email_verified'),
  image: text('image'),
});
