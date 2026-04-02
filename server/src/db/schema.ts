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
export const dogStatusEnum = pgEnum('dog_status', ['active', 'retired', 'deceased']);
export const healthCertTypeEnum = pgEnum('health_cert_type', [
	'ofa_hips',
	'ofa_elbows',
	'ofa_eyes',
	'ofa_heart',
	'dna_panel',
	'brucellosis',
	'other',
]);
export const healthCertResultEnum = pgEnum('health_cert_result', [
	'pass',
	'fail',
	'pending',
	'excellent',
	'good',
	'fair',
]);
export const litterStatusEnum = pgEnum('litter_status', [
	'planned',
	'confirmed',
	'born',
	'weaning',
	'available',
	'completed',
]);
export const puppyStatusEnum = pgEnum('puppy_status', [
	'available',
	'reserved',
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
export const updateTargetTypeEnum = pgEnum('update_target_type', ['litter', 'puppy', 'client']);
export const documentTypeEnum = pgEnum('document_type', [
	'contract',
	'health_record',
	'go_home_pack',
	'invoice',
	'other',
]);

// ─── Dogs ────────────────────────────────────────────────────────────────────

export const dogs = pgTable('dogs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	callName: text('call_name'),
	registeredName: text('registered_name'),
	breed: text('breed').notNull(),
	sex: dogSexEnum('sex').notNull(),
	dob: text('dob').notNull(), // ISO date
	colour: text('colour').notNull(),
	status: dogStatusEnum('status').notNull().default('active'),
	sireId: text('sire_id'), // self-ref, no FK to allow flexible pedigree entry
	damId: text('dam_id'),
	microchipNumber: text('microchip_number'),
	registrationNumber: text('registration_number'),
	profileImageUrl: text('profile_image_url'),
	imageUrls: jsonb('image_urls').$type<string[]>().notNull().default([]),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dogsRelations = relations(dogs, ({ one, many }) => ({
	sire: one(dogs, { fields: [dogs.sireId], references: [dogs.id], relationName: 'sire' }),
	dam: one(dogs, { fields: [dogs.damId], references: [dogs.id], relationName: 'dam' }),
	healthCerts: many(healthCerts),
	siredLitters: many(litters, { relationName: 'sire' }),
	damedLitters: many(litters, { relationName: 'dam' }),
}));

// ─── Health Certs ────────────────────────────────────────────────────────────

export const healthCerts = pgTable('health_certs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	dogId: text('dog_id').notNull().references(() => dogs.id, { onDelete: 'cascade' }),
	type: healthCertTypeEnum('type').notNull(),
	result: healthCertResultEnum('result').notNull(),
	certNumber: text('cert_number'),
	issuedBy: text('issued_by'),
	issuedAt: text('issued_at').notNull(),
	expiresAt: text('expires_at'),
	documentUrl: text('document_url'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const healthCertsRelations = relations(healthCerts, ({ one }) => ({
	dog: one(dogs, { fields: [healthCerts.dogId], references: [dogs.id] }),
}));

// ─── Litters ─────────────────────────────────────────────────────────────────

export const litters = pgTable('litters', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	breed: text('breed'),
	sireId: text('sire_id').notNull().references(() => dogs.id),
	damId: text('dam_id').notNull().references(() => dogs.id),
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

export const littersRelations = relations(litters, ({ one, many }) => ({
	sire: one(dogs, { fields: [litters.sireId], references: [dogs.id], relationName: 'sire' }),
	dam: one(dogs, { fields: [litters.damId], references: [dogs.id], relationName: 'dam' }),
	puppies: many(puppies),
	updates: many(updates),
	images: many(litterImages),
	notifications: many(litterNotifications),
	interests: many(litterInterests),
}));

// ─── Puppies ─────────────────────────────────────────────────────────────────

export const puppies = pgTable('puppies', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	dogId: text('dog_id').references(() => dogs.id), // set once graduated
	collarColour: text('collar_colour').notNull(),
	sex: dogSexEnum('sex').notNull(),
	colour: text('colour').notNull(),
	status: puppyStatusEnum('status').notNull().default('available'),
	birthWeight: real('birth_weight'),
	currentWeight: real('current_weight'),
	notes: text('notes'),
	profileImageUrl: text('profile_image_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const puppiesRelations = relations(puppies, ({ one, many }) => ({
	litter: one(litters, { fields: [puppies.litterId], references: [litters.id] }),
	dog: one(dogs, { fields: [puppies.dogId], references: [dogs.id] }),
	client: one(clients, { fields: [puppies.id], references: [clients.puppyId] }),
	interests: many(puppyInterests),
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
	updates: many(updates),
	puppyInterests: many(puppyInterests),
	notifications: many(litterNotifications),
	litterInterests: many(litterInterests),
}));

// ─── Updates ─────────────────────────────────────────────────────────────────

export const updates = pgTable('updates', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	body: text('body').notNull(),
	mediaUrls: jsonb('media_urls').$type<string[]>().notNull().default([]),
	targetType: updateTargetTypeEnum('target_type').notNull(),
	targetId: text('target_id').notNull(),
	isPublished: boolean('is_published').notNull().default(false),
	publishedAt: timestamp('published_at', { withTimezone: true }),
	weekNumber: integer('week_number'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const updatesRelations = relations(updates, ({ one }) => ({
	litter: one(litters, { fields: [updates.targetId], references: [litters.id] }),
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
