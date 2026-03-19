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
	'ready',
	'completed',
]);
export const puppyStatusEnum = pgEnum('puppy_status', [
	'available',
	'reserved',
	'placed',
	'retained',
	'not_for_sale',
]);
export const clientStageEnum = pgEnum('client_stage', [
	'enquiry',
	'reviewed',
	'waitlisted',
	'matched',
	'placed',
	'declined',
]);
export const updateTargetTypeEnum = pgEnum('update_target_type', ['litter', 'puppy', 'client']);
export const messageAuthorEnum = pgEnum('message_author', ['admin', 'client']);
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
	sireId: text('sire_id').notNull().references(() => dogs.id),
	damId: text('dam_id').notNull().references(() => dogs.id),
	status: litterStatusEnum('status').notNull().default('planned'),
	whelpDate: text('whelp_date'),
	expectedDate: text('expected_date'),
	puppyCount: integer('puppy_count'),
	availableCount: integer('available_count'),
	depositAmount: real('deposit_amount'),
	purchasePrice: real('purchase_price'),
	notes: text('notes'),
	isPublic: boolean('is_public').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const littersRelations = relations(litters, ({ one, many }) => ({
	sire: one(dogs, { fields: [litters.sireId], references: [dogs.id], relationName: 'sire' }),
	dam: one(dogs, { fields: [litters.damId], references: [dogs.id], relationName: 'dam' }),
	puppies: many(puppies),
	updates: many(updates),
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

export const puppiesRelations = relations(puppies, ({ one }) => ({
	litter: one(litters, { fields: [puppies.litterId], references: [litters.id] }),
	dog: one(dogs, { fields: [puppies.dogId], references: [dogs.id] }),
	client: one(clients, { fields: [puppies.id], references: [clients.puppyId] }),
}));

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id'), // Supabase auth uid
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull(),
	phone: text('phone'),
	city: text('city'),
	country: text('country').notNull().default('ZA'),
	stage: clientStageEnum('stage').notNull().default('enquiry'),
	priority: integer('priority').notNull().default(100),
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
	messages: many(messages),
	documents: many(documents),
	updates: many(updates),
	checklist: one(goHomeChecklists, { fields: [clients.id], references: [goHomeChecklists.clientId] }),
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

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	author: messageAuthorEnum('author').notNull(),
	body: text('body').notNull(),
	attachmentUrls: jsonb('attachment_urls').$type<string[]>().notNull().default([]),
	readAt: timestamp('read_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
	client: one(clients, { fields: [messages.clientId], references: [clients.id] }),
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

// ─── Go-Home Checklists ──────────────────────────────────────────────────────

export const goHomeChecklists = pgTable('go_home_checklists', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
	puppyId: text('puppy_id').notNull().references(() => puppies.id),
	vetCheckDone: boolean('vet_check_done').notNull().default(false),
	microchipRegistered: boolean('microchip_registered').notNull().default(false),
	contractSigned: boolean('contract_signed').notNull().default(false),
	depositPaid: boolean('deposit_paid').notNull().default(false),
	balancePaid: boolean('balance_paid').notNull().default(false),
	puppyPackPrepared: boolean('puppy_pack_prepared').notNull().default(false),
	goHomeDate: text('go_home_date'),
	notes: text('notes'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
