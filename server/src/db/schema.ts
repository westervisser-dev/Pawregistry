import {
	pgTable,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	pgEnum,
	real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const dogSexEnum = pgEnum('dog_sex', ['male', 'female']);
export const litterStatusEnum = pgEnum('litter_status', [
	'planned',
	'born',
	'available',
	'completed',
]);
export const puppyStatusEnum = pgEnum('puppy_status', [
	'available',
	'reserved',      // interest expressed, awaiting payment, 24h window active
	'booked',        // payment confirmed, pending admin match approval
	'matched',
	'matched_paid',
	'retained',
	'not_for_sale',
]);
export const clientStageEnum = pgEnum('client_stage', [
	'enquired',
	'approved',
	'rejected',
	'waitlisted',
	'match_requested',
	'matched',
	'matched_paid',
]);
export const depositStatusEnum = pgEnum('deposit_status', ['none', 'pending', 'paid']);
export const depositTierEnum = pgEnum('deposit_tier', ['r5000', 'r500']);
export const paymentTypeEnum = pgEnum('payment_type', ['deposit', 'booking', 'final']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'complete', 'failed', 'cancelled']);

export const documentTypeEnum = pgEnum('document_type', [
	'contract',
	'health_record',
	'go_home_pack',
	'invoice',
	'other',
]);

// ─── Litters ─────────────────────────────────────────────────────────────────

export const litters = pgTable('litters', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	breed: text('breed'),
	status: litterStatusEnum('status').notNull().default('planned'),
	whelpDate: text('whelp_date'),
	expectedDate: text('expected_date'),
	puppyCount: integer('puppy_count'),
	availableCount: integer('available_count'),
	depositAmount: real('deposit_amount'),
	notes: text('notes'),
	coverImageUrl: text('cover_image_url'),
	isPublic: boolean('is_public').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const littersRelations = relations(litters, ({ many }) => ({
	puppies: many(puppies),
	updates: many(updates),
	images: many(litterImages),
	notifications: many(litterNotifications),
	interests: many(litterInterests),
	updateOptOuts: many(litterUpdateOptOuts),
}));

// ─── Puppies ─────────────────────────────────────────────────────────────────

export const puppies = pgTable('puppies', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	collarColour: text('collar_colour').notNull(),
	sex: dogSexEnum('sex').notNull(),
	colour: text('colour').notNull(),
	status: puppyStatusEnum('status').notNull().default('available'),
	birthWeight: real('birth_weight'),
	currentWeight: real('current_weight'),
	notes: text('notes'),
	profileImageUrl: text('profile_image_url'),
	bookingExpiresAt: timestamp('booking_expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const puppiesRelations = relations(puppies, ({ one, many }) => ({
	litter: one(litters, { fields: [puppies.litterId], references: [litters.id] }),
	client: one(clients, { fields: [puppies.id], references: [clients.puppyId] }),
	interests: many(puppyInterests),
	images: many(puppyImages),
}));

// ─── Puppy Interests ──────────────────────────────────────────────────────────

export const puppyInterests = pgTable('puppy_interests', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	puppyId: text('puppy_id').notNull().references(() => puppies.id, { onDelete: 'cascade' }),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	status: text('status').notNull().default('pending'), // pending | approved | rejected
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const puppyInterestsRelations = relations(puppyInterests, ({ one }) => ({
	puppy: one(puppies, { fields: [puppyInterests.puppyId], references: [puppies.id] }),
	client: one(clients, { fields: [puppyInterests.clientId], references: [clients.id] }),
}));

// ─── Puppy Images ─────────────────────────────────────────────────────────────

export const puppyImages = pgTable('puppy_images', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	puppyId: text('puppy_id').notNull().references(() => puppies.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	storagePath: text('storage_path').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const puppyImagesRelations = relations(puppyImages, ({ one }) => ({
	puppy: one(puppies, { fields: [puppyImages.puppyId], references: [puppies.id] }),
}));

// ─── Litter Images ────────────────────────────────────────────────────────────

export const litterImages = pgTable('litter_images', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	storagePath: text('storage_path').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const litterImagesRelations = relations(litterImages, ({ one }) => ({
	litter: one(litters, { fields: [litterImages.litterId], references: [litters.id] }),
}));

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id'), // Supabase auth uid
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull().unique(),
	phone: text('phone'),
	city: text('city'),
	country: text('country').notNull().default('ZA'),
	stage: clientStageEnum('stage').notNull().default('enquired'),
	priority: integer('priority').notNull().default(100),
	depositStatus: depositStatusEnum('deposit_status').notNull().default('none'),
	depositTier: depositTierEnum('deposit_tier'),
	depositChosenAt: timestamp('deposit_chosen_at', { withTimezone: true }),
	puppyId: text('puppy_id').references(() => puppies.id),
	litterId: text('litter_id').references(() => litters.id),
	applicationData: jsonb('application_data').notNull().$type<Record<string, unknown>>(),
	adminNotes: text('admin_notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
	puppy: one(puppies, { fields: [clients.puppyId], references: [puppies.id] }),
	litter: one(litters, { fields: [clients.litterId], references: [litters.id] }),
	documents: many(documents),
	puppyInterests: many(puppyInterests),
	notifications: many(litterNotifications),
	litterInterests: many(litterInterests),
	updateOptOuts: many(litterUpdateOptOuts),
	payments: many(payments),
}));

// ─── Updates ─────────────────────────────────────────────────────────────────

export const updates = pgTable('updates', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	body: text('body').notNull(),
	mediaUrls: jsonb('media_urls').$type<string[]>().notNull().default([]),
	litterId: text('litter_id').references(() => litters.id, { onDelete: 'set null' }),
	isPublished: boolean('is_published').notNull().default(false),
	publishedAt: timestamp('published_at', { withTimezone: true }),
	emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
	weekNumber: integer('week_number'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const updatesRelations = relations(updates, ({ one }) => ({
	litter: one(litters, { fields: [updates.litterId], references: [litters.id] }),
}));

// ─── Litter Update Opt-Outs ───────────────────────────────────────────────────

export const litterUpdateOptOuts = pgTable('litter_update_opt_outs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const litterUpdateOptOutsRelations = relations(litterUpdateOptOuts, ({ one }) => ({
	client: one(clients, { fields: [litterUpdateOptOuts.clientId], references: [clients.id] }),
	litter: one(litters, { fields: [litterUpdateOptOuts.litterId], references: [litters.id] }),
}));

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	puppyId: text('puppy_id').references(() => puppies.id),
	type: documentTypeEnum('type').notNull(),
	label: text('label').notNull(),
	fileUrl: text('file_url').notNull(),
	signedAt: timestamp('signed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
	client: one(clients, { fields: [documents.clientId], references: [clients.id] }),
	puppy: one(puppies, { fields: [documents.puppyId], references: [puppies.id] }),
}));

// ─── Admins ───────────────────────────────────────────────────────────────────

export const admins = pgTable('admins', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').notNull().unique(), // Supabase auth UUID
	email: text('email').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Document Templates ───────────────────────────────────────────────────────

export const documentTemplates = pgTable('document_templates', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	description: text('description'),
	fileUrl: text('file_url').notNull(),
	category: text('category'),
	sortOrder: integer('sort_order').notNull().default(0),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentTemplatesRelations = relations(documentTemplates, ({ many }) => ({
	checklist: many(clientTemplateChecklist),
}));

// ─── Client Template Checklist ────────────────────────────────────────────────

export const clientTemplateChecklist = pgTable('client_template_checklist', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	templateId: text('template_id').notNull().references(() => documentTemplates.id, { onDelete: 'cascade' }),
	checkedAt: timestamp('checked_at', { withTimezone: true }),
	uploadedFileUrl: text('uploaded_file_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clientTemplateChecklistRelations = relations(clientTemplateChecklist, ({ one }) => ({
	client: one(clients, { fields: [clientTemplateChecklist.clientId], references: [clients.id] }),
	template: one(documentTemplates, { fields: [clientTemplateChecklist.templateId], references: [documentTemplates.id] }),
}));

// ─── Email Templates ──────────────────────────────────────────────────────────

export const emailTemplates = pgTable('email_templates', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	trigger: text('trigger').notNull().unique(),
	subject: text('subject').notNull(),
	body: text('body').notNull(),
	enabled: boolean('enabled').notNull().default(true),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Email Logs ───────────────────────────────────────────────────────────────

export const emailLogs = pgTable('email_logs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	trigger: text('trigger').notNull(),
	subject: text('subject').notNull(),
	resendId: text('resend_id'),
	sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
	metadata: jsonb('metadata').notNull().default({}).$type<Record<string, unknown>>(),
});

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
	client: one(clients, { fields: [emailLogs.clientId], references: [clients.id] }),
}));

// ─── Client Activity ──────────────────────────────────────────────────────────

export const clientActivity = pgTable('client_activity', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // application_submitted, stage_changed, deposit_changed, preferences_updated, notes_updated, document_uploaded, document_signed
	description: text('description').notNull(),
	metadata: jsonb('metadata').notNull().default({}).$type<Record<string, unknown>>(),
	actor: text('actor').notNull().default('system'), // client, admin, system
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clientActivityRelations = relations(clientActivity, ({ one }) => ({
	client: one(clients, { fields: [clientActivity.clientId], references: [clients.id] }),
}));

// ─── Litter Notifications ─────────────────────────────────────────────────────

export const litterNotifications = pgTable('litter_notifications', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	notifiedAt: timestamp('notified_at', { withTimezone: true }).notNull().defaultNow(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const litterNotificationsRelations = relations(litterNotifications, ({ one }) => ({
	litter: one(litters, { fields: [litterNotifications.litterId], references: [litters.id] }),
	client: one(clients, { fields: [litterNotifications.clientId], references: [clients.id] }),
}));

// ─── Litter Interests ─────────────────────────────────────────────────────────

export const litterInterests = pgTable('litter_interests', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const litterInterestsRelations = relations(litterInterests, ({ one }) => ({
	client: one(clients, { fields: [litterInterests.clientId], references: [clients.id] }),
	litter: one(litters, { fields: [litterInterests.litterId], references: [litters.id] }),
}));

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	type: paymentTypeEnum('type').notNull(),           // deposit | booking | final
	amountRands: real('amount_rands').notNull(),
	reference: text('reference').notNull().unique(),   // internal ref sent to Paystack
	paystackId: text('paystack_id'),                  // Paystack transaction ID, set on webhook
	authorizationUrl: text('authorization_url'),       // stored so Pay Now link can be resent
	status: paymentStatusEnum('status').notNull().default('pending'),
	expiresAt: timestamp('expires_at', { withTimezone: true }), // 24h window for booking type
	paidAt: timestamp('paid_at', { withTimezone: true }),
	metadata: jsonb('metadata').notNull().default({}).$type<Record<string, unknown>>(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
	client: one(clients, { fields: [payments.clientId], references: [clients.id] }),
}));
