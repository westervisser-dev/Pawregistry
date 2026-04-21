#!/usr/bin/env bun
/**
 * Paw Registry — Client Seed Script
 * ───────────────────────────────────────────────────────────────────────────
 * Wipes the clients table (cascading to all client-owned data) and seeds 10
 * fresh clients spanning the early lifecycle stages. No puppy/litter links —
 * those tables are expected to be empty for this seed.
 *
 * Cascades from `clients` delete:
 *   - client_activity, litter_notifications, puppy_interests, litter_interests
 *   - litter_update_opt_outs, client_template_checklist
 *   - email_logs, payments, invoices (and their dependent rows)
 *
 * Run from repo root: bun run server/scripts/seed-mock-data.ts
 * Requires env: DATABASE_URL
 */

import postgres from 'postgres';

// ─── Config ───────────────────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
	console.error('Missing required env var: DATABASE_URL');
	process.exit(1);
}

const db = postgres(DB_URL, { ssl: 'require' });

// ─── Application data helper ─────────────────────────────────────────────────
// Mirrors shared/src/index.ts → ClientApplication. Sensible defaults,
// overridable per client.

function mockAppData(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		// Existing
		livingType: 'house',
		otherLivingType: null,
		hasGarden: true,
		hasChildren: true,
		childrenAges: [],
		hasOtherPets: false,
		otherPetsDescription: null,
		previousDogExperience: true,
		experienceDescription: 'We grew up with dogs and are excited to welcome another into our home.',
		preferredSex: 'no_preference',
		preferredColour: null,
		reasonForBreed: null,
		references: null,
		agreedToContract: true,
		// Personal
		puppyPurpose: 'Family companion',
		residenceOwnership: 'own',
		primaryCaregiver: 'Both partners',
		allergiesToDogs: false,
		allFamilyMembersAgree: true,
		dogLivesIndoors: true,
		// Home
		yardSize: 'Medium — fully fenced',
		hasPoolOrDriveway: false,
		poolDrivewayFenced: false,
		puppyDaytimeLocation: 'Indoors with family, access to garden',
		hoursAlonePerDay: '2-4 hours',
		someoneHomeDuringDay: true,
		aloneArrangements: 'One partner works from home most days',
		neighbourhoodRestrictions: false,
		neighbourhoodRestrictionsDetails: null,
		childrenGenderAges: null,
		// Experience
		breedsOwnedPast: null,
		returnedPetToBreeder: false,
		returnedPetDetails: null,
		givenPetAway: false,
		givenPetAwayDetails: null,
		activityLevel: 'Active — daily walks and outdoor activities',
		willingForObedienceClasses: true,
		// Preferences
		readyTimeframe: 'asap',
		preferredBreedSize: 'golden_doodle - standard',
		secondChoiceBreedSize: null,
		considerOppositeSex: true,
		considerOtherColour: true,
		considerOtherBreedSize: false,
		considerRehome: false,
		budget: 'r10k_r20k',
		...overrides,
	};
}

// ─── Client data ──────────────────────────────────────────────────────────────
// 10 clients covering the early-lifecycle stages (no puppy/litter links):
//   - enquired (3)
//   - approved (1)
//   - rejected (1)
//   - waitlisted + deposit paid (2)
//   - waitlisted + deposit pending (1)
//   - waitlisted + no deposit (2)
//
// Deposit tier key: r5000 = Secured, r500 = Standard, null = Free/no-deposit

type SeedClient = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	city: string;
	country: string;
	stage: 'enquired' | 'approved' | 'rejected' | 'waitlisted';
	priority: number;
	depositStatus: 'none' | 'pending' | 'paid';
	depositTier: 'r5000' | 'r500' | null;
	adminNotes: string | null;
	appOverrides: Partial<Record<string, unknown>>;
};

const CLIENTS: SeedClient[] = [
	// ── Enquired (3) — fresh applications awaiting review ──────────────────────
	{
		id: 'client-001',
		firstName: 'Emma', lastName: 'van der Berg',
		email: 'emma.vanderberg@gmail.com', phone: '+27821234001',
		city: 'Cape Town', country: 'ZA',
		stage: 'enquired', priority: 60,
		depositStatus: 'none', depositTier: null,
		adminNotes: null,
		appOverrides: {
			livingType: 'house',
			hasChildren: true,
			childrenGenderAges: 'Girl 7, Boy 11',
			preferredBreedSize: 'golden_doodle - standard',
			secondChoiceBreedSize: 'golden_doodle - mini',
			budget: 'r10k_r20k',
		},
	},
	{
		id: 'client-002',
		firstName: 'Harper', lastName: 'Smit',
		email: 'harper.smit@hotmail.com', phone: '+27881234002',
		city: 'Somerset West', country: 'ZA',
		stage: 'enquired', priority: 62,
		depositStatus: 'none', depositTier: null,
		adminNotes: 'Send info pack on Cavapoos and scheduled litters.',
		appOverrides: {
			hasOtherPets: true,
			otherPetsDescription: 'One cat, dog-friendly',
			preferredBreedSize: 'cavapoo - mini',
			readyTimeframe: '6_months',
			budget: 'r10k_r20k',
		},
	},
	{
		id: 'client-003',
		firstName: 'Daniel', lastName: 'van Zyl',
		email: 'daniel.vanzyl@gmail.com', phone: '+27821234003',
		city: 'Boksburg', country: 'ZA',
		stage: 'enquired', priority: 65,
		depositStatus: 'none', depositTier: null,
		adminNotes: null,
		appOverrides: {
			hasOtherPets: true,
			otherPetsDescription: 'Two small dogs, very friendly',
			preferredBreedSize: 'pomapoo - mini',
			budget: 'r5k_r10k',
		},
	},

	// ── Approved (1) — application reviewed, not yet waitlisted ───────────────
	{
		id: 'client-004',
		firstName: 'Charlotte', lastName: 'Nel',
		email: 'charlotte.nel@outlook.com', phone: '+27831234004',
		city: 'Sandton', country: 'ZA',
		stage: 'approved', priority: 40,
		depositStatus: 'none', depositTier: null,
		adminNotes: 'Application reviewed and approved. Awaiting document checklist completion.',
		appOverrides: {
			preferredSex: 'male',
			preferredBreedSize: 'poodle - standard',
			budget: 'r10k_r20k',
		},
	},

	// ── Rejected (1) ──────────────────────────────────────────────────────────
	{
		id: 'client-005',
		firstName: 'Aiden', lastName: 'Potgieter',
		email: 'aiden.potgieter@gmail.com', phone: '+27881234005',
		city: 'Springs', country: 'ZA',
		stage: 'rejected', priority: 99,
		depositStatus: 'none', depositTier: null,
		adminNotes: 'Rejected — works 12-hour shifts, puppy would be alone too long.',
		appOverrides: {
			hoursAlonePerDay: '10-12 hours',
			someoneHomeDuringDay: false,
			preferredBreedSize: 'golden_doodle - standard',
			budget: 'r5k_r10k',
		},
	},

	// ── Waitlisted + deposit paid (2) ─────────────────────────────────────────
	{
		id: 'client-006',
		firstName: 'Olivia', lastName: 'Coetzee',
		email: 'olivia.coetzee@icloud.com', phone: '+27851234006',
		city: 'Durban', country: 'ZA',
		stage: 'waitlisted', priority: 1,
		depositStatus: 'paid', depositTier: 'r5000',
		adminNotes: 'Secured tier deposit paid. Allergic, wants a Cavapoo.',
		appOverrides: {
			allergiesToDogs: true,
			preferredSex: 'female',
			preferredBreedSize: 'cavapoo - standard',
			secondChoiceBreedSize: 'cavapoo - mini',
			budget: 'r10k_r20k',
		},
	},
	{
		id: 'client-007',
		firstName: 'Noah', lastName: 'Fourie',
		email: 'noah.fourie@gmail.com', phone: '+27861234007',
		city: 'Port Elizabeth', country: 'ZA',
		stage: 'waitlisted', priority: 3,
		depositStatus: 'paid', depositTier: 'r500',
		adminNotes: 'Standard tier deposit paid. Townhouse in PE, no kids.',
		appOverrides: {
			livingType: 'townhouse',
			hasChildren: false,
			childrenGenderAges: null,
			preferredBreedSize: 'cockapoo - mini',
			secondChoiceBreedSize: 'cockapoo - standard',
			budget: 'r5k_r10k',
		},
	},

	// ── Waitlisted + deposit pending (1) ──────────────────────────────────────
	{
		id: 'client-008',
		firstName: 'Abigail', lastName: 'de Villiers',
		email: 'abigail.devilliers@gmail.com', phone: '+27711234008',
		city: 'Cape Town', country: 'ZA',
		stage: 'waitlisted', priority: 6,
		depositStatus: 'pending', depositTier: 'r5000',
		adminNotes: 'Deposit pending EFT confirmation. Very thorough application.',
		appOverrides: {
			allergiesToDogs: true,
			livingType: 'house',
			preferredBreedSize: 'poodle - mini',
			secondChoiceBreedSize: 'toy_poodle - mini',
			budget: 'r10k_r20k',
		},
	},

	// ── Waitlisted + no deposit (2) ───────────────────────────────────────────
	{
		id: 'client-009',
		firstName: 'Grace', lastName: 'Badenhorst',
		email: 'grace.badenhorst@gmail.com', phone: '+27831234009',
		city: 'Hartbeespoort', country: 'ZA',
		stage: 'waitlisted', priority: 12,
		depositStatus: 'none', depositTier: null,
		adminNotes: 'Free tier — farm lifestyle, lots of space.',
		appOverrides: {
			livingType: 'farm',
			yardSize: 'Large farm property with dams',
			hasGarden: true,
			preferredBreedSize: 'aussie_doodle - standard',
			budget: 'r10k_r20k',
		},
	},
	{
		id: 'client-010',
		firstName: 'Zara', lastName: 'Malan',
		email: 'zara.malan@gmail.com', phone: '+27821234010',
		city: 'Franschhoek', country: 'ZA',
		stage: 'waitlisted', priority: 15,
		depositStatus: 'none', depositTier: null,
		adminNotes: 'Free tier — active runner, wants a pure-breed English Cocker.',
		appOverrides: {
			preferredBreedSize: 'english_cocker_spaniel - standard',
			activityLevel: 'Very active — trail running and hiking',
			livingType: 'house',
			budget: 'r10k_r20k',
		},
	},
];

// ─── Activity events ──────────────────────────────────────────────────────────
// Builds a realistic timeline of activity events per client based on their
// current stage and deposit status.

function activityEventsForClient(client: SeedClient) {
	const events: Array<{ type: string; description: string; actor: string; metadata: Record<string, unknown> }> = [];

	events.push({
		type: 'application_submitted',
		description: 'Application submitted via online form.',
		actor: 'client',
		metadata: {},
	});

	if (client.stage === 'approved' || client.stage === 'waitlisted') {
		events.push({
			type: 'stage_changed',
			description: 'Application reviewed and approved by admin.',
			actor: 'admin',
			metadata: { from: 'enquired', to: 'approved' },
		});
	}

	if (client.stage === 'waitlisted') {
		events.push({
			type: 'stage_changed',
			description: 'All required documents verified. Client moved to waitlist.',
			actor: 'system',
			metadata: { from: 'approved', to: 'waitlisted' },
		});
	}

	if (client.stage === 'rejected') {
		events.push({
			type: 'stage_changed',
			description: 'Application rejected. Reason noted in admin notes.',
			actor: 'admin',
			metadata: { from: 'enquired', to: 'rejected' },
		});
	}

	if (client.depositStatus === 'pending') {
		events.push({
			type: 'deposit_changed',
			description: 'Client indicated intent to pay deposit.',
			actor: 'client',
			metadata: { from: 'none', to: 'pending', tier: client.depositTier },
		});
	}

	if (client.depositStatus === 'paid') {
		events.push({
			type: 'deposit_changed',
			description: 'Client indicated intent to pay deposit.',
			actor: 'client',
			metadata: { from: 'none', to: 'pending', tier: client.depositTier },
		});
		events.push({
			type: 'deposit_paid',
			description: 'Deposit payment confirmed.',
			actor: 'admin',
			metadata: { from: 'pending', to: 'paid', tier: client.depositTier },
		});
	}

	if (client.adminNotes) {
		events.push({
			type: 'notes_updated',
			description: 'Admin notes updated.',
			actor: 'admin',
			metadata: {},
		});
	}

	return events;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log('\ud83d\udc3e Starting Paw Registry client seed...\n');

	// ── Step 1: Wipe existing client data ──────────────────────────────────────
	// Deleting from `clients` cascades to client_activity, litter_notifications,
	// puppy_interests, litter_interests, litter_update_opt_outs,
	// client_template_checklist, email_logs, payments, invoices.
	console.log('\ud83d\uddd1\ufe0f  Wiping existing client data...');
	await db`DELETE FROM clients`;
	console.log('  \u2713 Clients and dependent rows cleared\n');

	// ── Step 2: Insert clients ─────────────────────────────────────────────────
	console.log('\ud83d\udc65 Inserting clients...');
	for (const client of CLIENTS) {
		const appData = mockAppData(client.appOverrides);
		const depositChosenAt = client.depositTier ? new Date() : null;
		await db`
			INSERT INTO clients (
				id, user_id, first_name, last_name, email, phone, city, country,
				stage, priority, deposit_status, deposit_tier, deposit_chosen_at,
				puppy_id, litter_id,
				application_data, admin_notes, reserved_at, matched_at,
				created_at, updated_at
			) VALUES (
				${client.id}, NULL, ${client.firstName}, ${client.lastName},
				${client.email}, ${client.phone}, ${client.city}, ${client.country},
				${client.stage}, ${client.priority},
				${client.depositStatus}, ${client.depositTier},
				${depositChosenAt},
				NULL, NULL,
				${JSON.stringify(appData)},
				${client.adminNotes},
				NULL, NULL,
				NOW(), NOW()
			)
		`;
		console.log(`  \u2713 ${client.firstName} ${client.lastName} \u2014 ${client.stage} / deposit: ${client.depositStatus} / tier: ${client.depositTier ?? 'none'}`);
	}

	// ── Step 3: Insert client activity timeline ───────────────────────────────
	console.log('\n\ud83d\udccb Inserting client activity...');
	let totalActivity = 0;

	for (const client of CLIENTS) {
		const events = activityEventsForClient(client);
		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			const eventId = `act-${client.id}-${i + 1}`;
			const offsetMinutes = (events.length - i) * 1440; // 1 day between events
			await db`
				INSERT INTO client_activity (
					id, client_id, type, description, metadata, actor, created_at
				) VALUES (
					${eventId}, ${client.id}, ${ev.type}, ${ev.description},
					${JSON.stringify(ev.metadata)}, ${ev.actor},
					NOW() - (${offsetMinutes} || ' minutes')::interval
				)
			`;
		}
		totalActivity += events.length;
		console.log(`  \u2713 ${client.firstName} ${client.lastName}: ${events.length} events`);
	}

	// ── Done ──────────────────────────────────────────────────────────────────
	console.log('\n\u2705 Seed complete!');
	console.log(`   Clients:           ${CLIENTS.length}`);
	console.log(`     enquired:          ${CLIENTS.filter(c => c.stage === 'enquired').length}`);
	console.log(`     approved:          ${CLIENTS.filter(c => c.stage === 'approved').length}`);
	console.log(`     rejected:          ${CLIENTS.filter(c => c.stage === 'rejected').length}`);
	console.log(`     waitlisted:        ${CLIENTS.filter(c => c.stage === 'waitlisted').length}`);
	console.log(`       \u00b7 deposit paid:    ${CLIENTS.filter(c => c.stage === 'waitlisted' && c.depositStatus === 'paid').length}`);
	console.log(`       \u00b7 deposit pending: ${CLIENTS.filter(c => c.stage === 'waitlisted' && c.depositStatus === 'pending').length}`);
	console.log(`       \u00b7 no deposit:      ${CLIENTS.filter(c => c.stage === 'waitlisted' && c.depositStatus === 'none').length}`);
	console.log(`   Activity events:   ${totalActivity}`);

	await db.end();
	process.exit(0);
}

main().catch((err) => {
	console.error('\u274c Seed failed:', err);
	process.exit(1);
});
