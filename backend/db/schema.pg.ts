import { pgTable, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

// --- Core Entities ---

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  password: text('password'),
  role: text('role').default('operator'),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
});

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  code: text('code').unique(),
  displayId: text('display_id').unique(),
  name: text('name').notNull(),
  nif: text('nif'),
  address: text('address'),
  bankAccountRef: text('bank_account_ref'),
  status: text('status').default('active'),
  adminFeeRate: doublePrecision('admin_fee_rate').default(0),
  adminFeeFixed: doublePrecision('admin_fee_fixed').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
});

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  unitCode: text('unit_code').notNull(),
  floor: text('floor'),
  door: text('door'),
  type: text('type').default('vivienda'),
  coefficient: doublePrecision('coefficient').default(0),
  monthlyFee: doublePrecision('monthly_fee').default(0),
  active: integer('active').default(1),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
});

export const owners = pgTable('owners', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
  mailingAddress: text('mailing_address'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
});

export const unitOwners = pgTable('unit_owners', {
  id: text('id').primaryKey(),
  unitId: text('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').references(() => owners.id, { onDelete: 'cascade' }),
  ownershipPercentage: doublePrecision('ownership_percentage').default(100),
});

export const providers = pgTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  phone: text('phone'),
  email: text('email'),
  rating: doublePrecision('rating').default(0),
});

// --- Financial Model ---

export const bankTransactions = pgTable('bank_transactions', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  transactionDate: text('transaction_date').notNull(),
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  direction: text('direction').notNull(),
  category: text('category'),
  reviewStatus: text('review_status').default('pending'),
});

export const charges = pgTable('charges', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  unitId: text('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').references(() => owners.id, { onDelete: 'cascade' }),
  concept: text('concept').notNull(),
  amount: doublePrecision('amount').notNull(),
  issueDate: timestamp('issue_date').defaultNow(),
  dueDate: text('due_date').notNull(),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  chargeId: text('charge_id').references(() => charges.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').references(() => bankTransactions.id),
  amount: doublePrecision('amount').notNull(),
  paymentDate: timestamp('payment_date').defaultNow(),
  source: text('source'),
  reference: text('reference'),
});

// --- Automation ---

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: text('payload'),
  status: text('status').default('pending'),
  attempts: integer('attempts').default(0),
  scheduledAt: text('scheduled_at'),
  executedAt: text('executed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const callCampaigns = pgTable('call_campaigns', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id),
  type: text('type'),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const calls = pgTable('calls', {
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

export const callTasks = pgTable('call_tasks', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => owners.id),
  scheduledFor: text('scheduled_for').notNull(),
  status: text('status').default('pending'),
  attempts: integer('attempts').default(0),
});

// --- Audit ---

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  metadata: text('metadata'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Supporting Entities ---

export const incidents = pgTable('incidents', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('pending'),
  priority: text('priority').default('medium'),
  providerId: text('provider_id').references(() => providers.id),
  ownerId: text('owner_id').references(() => owners.id),
  unitId: text('unit_id').references(() => units.id),
  cost: doublePrecision('cost'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankStatements = pgTable('bank_statements', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  uploadDate: timestamp('upload_date').defaultNow(),
});

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  category: text('category').default('others'),
  metadata: text('metadata'),
  uploadDate: timestamp('upload_date').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'),
  read: integer('read').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const minutes = pgTable('minutes', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  meetingDate: text('meeting_date').notNull(),
  attendees: text('attendees'),
  agendaItems: text('agenda_items'),
  content: text('content').notNull(),
  generatedBy: text('generated_by').default('ai'),
  status: text('status').default('draft'),
  signatureToken: text('signature_token'),
  signedAt: text('signed_at'),
  signers: text('signers'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  items: text('items'),
  totalAmount: doublePrecision('total_amount').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const facilities = pgTable('facilities', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').default('sala'),
  icon: text('icon').default('🏢'),
  description: text('description'),
  capacity: integer('capacity').default(10),
  pricePerSlot: doublePrecision('price_per_slot').default(0),
  slotDuration: integer('slot_duration').default(60),
  openTime: text('open_time').default('09:00'),
  closeTime: text('close_time').default('22:00'),
  maxDaysAhead: integer('max_days_ahead').default(14),
  requiresApproval: integer('requires_approval').default(0),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  facilityId: text('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  ownerId: text('owner_id').references(() => owners.id, { onDelete: 'set null' }),
  bookingDate: text('booking_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  status: text('status').default('confirmed'),
  notes: text('notes'),
  qrCode: text('qr_code'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const communications = pgTable('communications', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  recipientCount: integer('recipient_count').default(0),
  status: text('status').default('sent'),
  sentAt: timestamp('sent_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
