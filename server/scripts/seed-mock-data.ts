#!/usr/bin/env bun
/**
 * Mock data seed script for Paw Registry
 * — Downloads real dog images from dog.ceo API
 * — Uploads them to Supabase Storage buckets
 * — Inserts 10 dogs, 6 litters (with 4-photo galleries), 30 clients
 *
 * Run from repo root: bun run server/scripts/seed-mock-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://zcwhufmgfzttwdhakxzc.supabase.co';
const SUPABASE_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjd2h1Zm1nZnp0dHdkaGFreHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc0NzEwMSwiZXhwIjoyMDg5MzIzMTAxfQ.w5VSOnMl-Wcyl1YXABNOll82WwKN4IiGCea0W_fI18A';
const DB_URL =
	'postgresql://postgres.zcwhufmgfzttwdhakxzc:Wvisser22!!!@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const db = postgres(DB_URL, { ssl: 'require' });

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function fetchDogApiImageUrl(breedPath: string): Promise<string> {
	const res = await fetch(`https://dog.ceo/api/breed/${breedPath}/images/random`);
	const data = (await res.json()) as { message: string; status: string };
	if (data.status !== 'success') throw new Error(`dog.ceo API error for ${breedPath}`);
	return data.message;
}

async function fetchDogApiImageUrls(breedPath: string, count: number): Promise<string[]> {
	const res = await fetch(`https://dog.ceo/api/breed/${breedPath}/images/random/${count}`);
	const data = (await res.json()) as { message: string[]; status: string };
	if (data.status !== 'success') throw new Error(`dog.ceo API error for ${breedPath}`);
	return data.message.slice(0, count);
}

async function uploadImage(bucket: string, path: string, imageUrl: string): Promise<string> {
	const imgRes = await fetch(imageUrl);
	if (!imgRes.ok) throw new Error(`Failed to download image: ${imageUrl}`);
	const buffer = Buffer.from(await imgRes.arrayBuffer());
	const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

	const { data, error } = await supabase.storage
		.from(bucket)
		.upload(path, buffer, { contentType, upsert: true });

	if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
	const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
	return publicUrl;
}

// ─── Dog data ─────────────────────────────────────────────────────────────────

const DOGS = [
	// ── Golden Retrievers (3 females – dams for F1 litters) ──────────────────
	{
		id: 'dog-gr-001',
		name: 'Honey',
		callName: 'Honey',
		registeredName: 'Sunridge Golden Honey',
		breed: 'Golden Retriever',
		sex: 'female',
		dob: '2020-03-15',
		colour: 'Golden',
		status: 'active',
		microchipNumber: '953000123456001',
		registrationNumber: 'KUSA-GR-2020-001',
		notes: 'Champion bloodline, exceptional temperament. OFA certified for hips and elbows. Loves water and is a natural retriever with a very soft mouth.',
		apiBreed: 'retriever/golden',
	},
	{
		id: 'dog-gr-002',
		name: 'Amber',
		callName: 'Ambs',
		registeredName: 'Sunridge Golden Amber',
		breed: 'Golden Retriever',
		sex: 'female',
		dob: '2021-06-22',
		colour: 'Light Golden',
		status: 'active',
		microchipNumber: '953000123456002',
		registrationNumber: 'KUSA-GR-2021-002',
		notes: 'Excellent conformation and very gentle with children. DNA panel completely clear. Consistently produces puppies with outstanding temperaments.',
		apiBreed: 'retriever/golden',
	},
	{
		id: 'dog-gr-003',
		name: 'Rosie',
		callName: 'Rose',
		registeredName: 'Sunridge Golden Rosie',
		breed: 'Golden Retriever',
		sex: 'female',
		dob: '2022-01-10',
		colour: 'Dark Golden',
		status: 'active',
		microchipNumber: '953000123456003',
		registrationNumber: 'KUSA-GR-2022-003',
		notes: 'Third generation from our breeding program. Exceptional intelligence and trainability. Passed all pre-breeding health evaluations.',
		apiBreed: 'retriever/golden',
	},
	// ── Standard Poodles (2 males – sires, 1 female) ─────────────────────────
	{
		id: 'dog-p-001',
		name: 'Duke',
		callName: 'Duke',
		registeredName: 'Royalline Phantom Duke',
		breed: 'Standard Poodle',
		sex: 'male',
		dob: '2019-09-05',
		colour: 'Black',
		status: 'active',
		microchipNumber: '953000123456004',
		registrationNumber: 'KUSA-SP-2019-004',
		notes: 'International champion bloodlines. Non-shedding coat confirmed. Tested clear on all genetic panels. Produces puppies with excellent structure and coat quality.',
		apiBreed: 'poodle/standard',
	},
	{
		id: 'dog-p-002',
		name: 'Pierre',
		callName: 'Pier',
		registeredName: 'Royalline Apricot Pierre',
		breed: 'Standard Poodle',
		sex: 'male',
		dob: '2020-11-18',
		colour: 'Apricot',
		status: 'active',
		microchipNumber: '953000123456005',
		registrationNumber: 'KUSA-SP-2020-005',
		notes: 'Stunning apricot colouring, highly trainable. OFA hips rated Excellent. Passes beautiful warm tones to offspring and consistently produces low-shedding puppies.',
		apiBreed: 'poodle/standard',
	},
	{
		id: 'dog-p-003',
		name: 'Pearl',
		callName: 'Pearlie',
		registeredName: 'Royalline White Pearl',
		breed: 'Standard Poodle',
		sex: 'female',
		dob: '2021-04-30',
		colour: 'White',
		status: 'active',
		microchipNumber: '953000123456006',
		registrationNumber: 'KUSA-SP-2021-006',
		notes: 'Beautiful white coat with exceptional structure and movement. Very calm and loving nature. DNA panel clear for all tested conditions.',
		apiBreed: 'poodle/standard',
	},
	// ── Golden Doodles (1 female – dam for F1b, 1 male) ──────────────────────
	{
		id: 'dog-gd-001',
		name: 'Daisy',
		callName: 'Dais',
		registeredName: 'Sunridge Doodle Daisy',
		breed: 'F1 Golden Doodle',
		sex: 'female',
		dob: '2022-07-14',
		colour: 'Cream',
		status: 'active',
		microchipNumber: '953000123456007',
		registrationNumber: 'WWKC-GD-2022-007',
		notes: 'F1 Golden Doodle with gorgeous wavy low-shed coat. Exceptional family dog, great with children and other animals. Produces consistently wonderful puppies.',
		apiBreed: 'retriever/golden',
	},
	{
		id: 'dog-gd-002',
		name: 'Teddy',
		callName: 'Ted',
		registeredName: 'Sunridge Doodle Teddy',
		breed: 'F1 Golden Doodle',
		sex: 'male',
		dob: '2022-09-03',
		colour: 'Caramel',
		status: 'active',
		microchipNumber: '953000123456008',
		registrationNumber: 'WWKC-GD-2022-008',
		notes: 'F1 Golden Doodle with curly hypoallergenic coat. Very playful and outgoing, excellent temperament scores. Passed all health screenings.',
		apiBreed: 'retriever/golden',
	},
	// ── Border Collies (1 male, 1 female) ────────────────────────────────────
	{
		id: 'dog-bc-001',
		name: 'Scout',
		callName: 'Scout',
		registeredName: 'Hillcrest Scout',
		breed: 'Border Collie',
		sex: 'male',
		dob: '2020-05-20',
		colour: 'Black & White',
		status: 'active',
		microchipNumber: '953000123456009',
		registrationNumber: 'KUSA-BC-2020-009',
		notes: 'Working bloodlines with exceptional intelligence. Herding instinct fully intact and agility competitor. OFA hips rated Good. A truly remarkable athlete.',
		apiBreed: 'collie/border',
	},
	{
		id: 'dog-bc-002',
		name: 'Luna',
		callName: 'Lu',
		registeredName: 'Hillcrest Luna Star',
		breed: 'Border Collie',
		sex: 'female',
		dob: '2021-08-12',
		colour: 'Blue Merle',
		status: 'active',
		microchipNumber: '953000123456010',
		registrationNumber: 'KUSA-BC-2021-010',
		notes: 'Rare blue merle colouring with striking pale eyes. Extremely agile and athletic with very high trainability. Sociable and confident temperament.',
		apiBreed: 'collie/border',
	},
];

// ─── Litter data ──────────────────────────────────────────────────────────────

const LITTERS = [
	{
		id: 'litter-f1gd-001',
		name: 'Spring 2024 F1 Golden Doodle Litter',
		breed: 'F1 Golden Doodle',
		sireId: 'dog-p-001',
		damId: 'dog-gr-001',
		status: 'completed',
		whelpDate: '2024-04-15',
		expectedDate: '2024-04-10',
		puppyCount: 6,
		availableCount: 0,
		depositAmount: 3000,
		purchasePrice: 18000,
		notes: 'Stunning litter of 6 with excellent temperaments — 4 females and 2 males. All placed to loving homes. Produced puppies in cream to golden colouring with wavy coats.',
		isPublic: false,
		galleryBreed: 'retriever/golden',
	},
	{
		id: 'litter-f1gd-002',
		name: 'Winter 2025 F1 Golden Doodle Litter',
		breed: 'F1 Golden Doodle',
		sireId: 'dog-p-001',
		damId: 'dog-gr-002',
		status: 'ready',
		whelpDate: '2025-12-01',
		expectedDate: '2025-11-28',
		puppyCount: 7,
		availableCount: 3,
		depositAmount: 3000,
		purchasePrice: 18000,
		notes: 'Beautiful litter of 7 puppies ready to go to their forever homes! Wavy to curly coats in apricot, cream, and golden. All vet-checked and microchipped.',
		isPublic: true,
		galleryBreed: 'retriever/golden',
	},
	{
		id: 'litter-f1gd-003',
		name: 'February 2026 F1 Golden Doodle Litter',
		breed: 'F1 Golden Doodle',
		sireId: 'dog-p-002',
		damId: 'dog-gr-003',
		status: 'born',
		whelpDate: '2026-02-10',
		expectedDate: '2026-02-07',
		puppyCount: 5,
		availableCount: 5,
		depositAmount: 3000,
		purchasePrice: 18500,
		notes: 'New litter born February 2026! Pierre and Rosie have produced 3 males and 2 females. All are healthy and feeding well. First progress photos at 3 weeks.',
		isPublic: true,
		galleryBreed: 'retriever/golden',
	},
	{
		id: 'litter-f1bgd-001',
		name: 'January 2026 F1b Golden Doodle Litter',
		breed: 'F1b Golden Doodle',
		sireId: 'dog-p-001',
		damId: 'dog-gd-001',
		status: 'weaning',
		whelpDate: '2026-01-20',
		expectedDate: '2026-01-18',
		puppyCount: 6,
		availableCount: 4,
		depositAmount: 3500,
		purchasePrice: 22000,
		notes: 'F1b litter producing ultra-low shedding puppies — ideal for allergy sufferers. Eyes are open and they are exploring the world! Curly coats in cream and apricot.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
	{
		id: 'litter-f1bgd-002',
		name: 'April 2026 F1b Golden Doodle Litter',
		breed: 'F1b Golden Doodle',
		sireId: 'dog-p-002',
		damId: 'dog-gd-001',
		status: 'confirmed',
		whelpDate: null,
		expectedDate: '2026-04-15',
		puppyCount: null,
		availableCount: null,
		depositAmount: 3500,
		purchasePrice: 22000,
		notes: 'Confirmed pregnancy! Pierre and Daisy have produced exceptional puppies previously. Deposits now being accepted. Expected 5–7 puppies in curly, low-shedding coats.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
	{
		id: 'litter-bwd-001',
		name: 'May 2026 Biewer Doodle Litter',
		breed: 'Biewer Doodle',
		sireId: 'dog-p-002',
		damId: 'dog-gr-001',
		status: 'planned',
		whelpDate: null,
		expectedDate: '2026-05-20',
		puppyCount: null,
		availableCount: null,
		depositAmount: 4000,
		purchasePrice: 25000,
		notes: 'Our first planned Biewer Doodle litter — registrations of interest now open! Limited availability expected. These tiny, tri-coloured gems will be exceptionally rare.',
		isPublic: true,
		galleryBreed: 'poodle/miniature',
	},
];

// ─── Client data ──────────────────────────────────────────────────────────────

function mockAppData(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		livingType: 'house',
		otherLivingType: null,
		hasGarden: true,
		hasChildren: true,
		childrenAges: [5, 9],
		hasOtherPets: false,
		otherPetsDescription: null,
		previousDogExperience: true,
		experienceDescription: 'We had a Golden Retriever growing up and have always wanted another dog in the family.',
		preferredSex: 'no_preference',
		preferredColour: null,
		reasonForBreed: 'We love the low-shedding, hypoallergenic qualities combined with the wonderful family temperament.',
		references: null,
		agreedToContract: true,
		puppyPurpose: 'Family companion',
		residenceOwnership: 'own',
		primaryCaregiver: 'Mother',
		allergiesToDogs: false,
		allFamilyMembersAgree: true,
		dogLivesIndoors: true,
		yardSize: 'Large — fully fenced',
		hasPoolOrDriveway: true,
		poolDrivewayFenced: true,
		puppyDaytimeLocation: 'Indoors with family, access to garden',
		hoursAlonePerDay: '2–4 hours',
		someoneHomeDuringDay: true,
		aloneArrangements: 'Partner works from home on most days',
		neighbourhoodRestrictions: false,
		neighbourhoodRestrictionsDetails: null,
		childrenGenderAges: null,
		breedsOwnedPast: 'Golden Retriever',
		returnedPetToBreeder: false,
		returnedPetDetails: null,
		givenPetAway: false,
		givenPetAwayDetails: null,
		activityLevel: 'Active — daily walks and outdoor activities',
		willingForObedienceClasses: true,
		readyTimeframe: 'asap',
		preferredBreedSize: 'Medium',
		secondChoiceBreedSize: 'Large',
		considerOppositeSex: true,
		considerOtherColour: true,
		considerOtherBreedSize: false,
		considerRehome: false,
		...overrides,
	};
}

const CLIENTS = [
	{ id: 'client-001', firstName: 'Emma', lastName: 'van der Berg', email: 'emma.vanderberg@gmail.com', phone: '+27821234001', city: 'Cape Town', country: 'ZA', stage: 'placed', priority: 5, adminNotes: 'Wonderful family, very responsive. Collected their puppy in January 2026. Regular updates received.', appOverrides: { livingType: 'house', hasChildren: true, childrenAges: [7, 11], readyTimeframe: 'asap' } },
	{ id: 'client-002', firstName: 'James', lastName: 'Pretorius', email: 'james.pretorius@outlook.com', phone: '+27831234002', city: 'Johannesburg', country: 'ZA', stage: 'placed', priority: 8, adminNotes: 'Single professional, works from home full time. Excellent match for Buddy.', appOverrides: { hasChildren: false, childrenAges: [], someoneHomeDuringDay: true, livingType: 'apartment' } },
	{ id: 'client-003', firstName: 'Sophia', lastName: 'Nkosi', email: 'sophia.nkosi@yahoo.com', phone: '+27711234003', city: 'Pretoria', country: 'ZA', stage: 'matched', priority: 12, adminNotes: 'Matched to litter-f1gd-002. Deposit paid. Going home mid-March.', appOverrides: { preferredSex: 'female', preferredColour: 'Cream', readyTimeframe: 'asap' } },
	{ id: 'client-004', firstName: 'Liam', lastName: 'Botha', email: 'liam.botha@gmail.com', phone: '+27841234004', city: 'Stellenbosch', country: 'ZA', stage: 'matched', priority: 15, adminNotes: 'Matched to litter-f1bgd-001. Wine farmer — large property. Dog will have lots of space.', appOverrides: { livingType: 'farm', yardSize: 'Large farm property', hasGarden: true } },
	{ id: 'client-005', firstName: 'Olivia', lastName: 'Coetzee', email: 'olivia.coetzee@icloud.com', phone: '+27851234005', city: 'Durban', country: 'ZA', stage: 'waitlisted', priority: 20, adminNotes: 'Strong application, waiting on F1b litter. Very patient and communicative.', appOverrides: { allergiesToDogs: true, preferredSex: 'female' } },
	{ id: 'client-006', firstName: 'Noah', lastName: 'Fourie', email: 'noah.fourie@gmail.com', phone: '+27861234006', city: 'Port Elizabeth', country: 'ZA', stage: 'waitlisted', priority: 22, adminNotes: null, appOverrides: { livingType: 'townhouse', hasChildren: false, childrenAges: [] } },
	{ id: 'client-007', firstName: 'Ava', lastName: 'Swanepoel', email: 'ava.swanepoel@yahoo.com', phone: '+27871234007', city: 'Bloemfontein', country: 'ZA', stage: 'waitlisted', priority: 25, adminNotes: 'Waiting on Biewer Doodle litter. Very excited, has done extensive research on the breed.', appOverrides: { preferredBreedSize: 'Small', livingType: 'house' } },
	{ id: 'client-008', firstName: 'Ethan', lastName: 'du Plessis', email: 'ethan.duplessis@gmail.com', phone: '+27881234008', city: 'Cape Town', country: 'ZA', stage: 'waitlisted', priority: 28, adminNotes: null, appOverrides: { hasChildren: true, childrenAges: [3, 6, 10] } },
	{ id: 'client-009', firstName: 'Isabella', lastName: 'Kruger', email: 'isabella.kruger@hotmail.com', phone: '+27891234009', city: 'Johannesburg', country: 'ZA', stage: 'waitlisted', priority: 30, adminNotes: 'Allergic to shedding breeds. Very keen on F1b. Follow up regarding timeline.', appOverrides: { allergiesToDogs: true, readyTimeframe: '6_months' } },
	{ id: 'client-010', firstName: 'Mason', lastName: 'van Wyk', email: 'mason.vanwyk@gmail.com', phone: '+27821234010', city: 'Centurion', country: 'ZA', stage: 'waitlisted', priority: 32, adminNotes: null, appOverrides: { livingType: 'house', hasGarden: true } },
	{ id: 'client-011', firstName: 'Charlotte', lastName: 'Nel', email: 'charlotte.nel@outlook.com', phone: '+27831234011', city: 'Sandton', country: 'ZA', stage: 'reviewed', priority: 35, adminNotes: 'Application reviewed. Good fit for F1 litter. Will contact when F1gd-003 ready.', appOverrides: { preferredSex: 'male' } },
	{ id: 'client-012', firstName: 'Logan', lastName: 'Viljoen', email: 'logan.viljoen@gmail.com', phone: '+27711234012', city: 'Roodepoort', country: 'ZA', stage: 'reviewed', priority: 38, adminNotes: 'Reviewed — lives in a complex, confirmed pet-friendly lease.', appOverrides: { livingType: 'apartment', residenceOwnership: 'rent' } },
	{ id: 'client-013', firstName: 'Amelia', lastName: 'Joubert', email: 'amelia.joubert@yahoo.com', phone: '+27841234013', city: 'George', country: 'ZA', stage: 'reviewed', priority: 40, adminNotes: null, appOverrides: { livingType: 'house', hasChildren: true, childrenAges: [2, 5] } },
	{ id: 'client-014', firstName: 'Lucas', lastName: 'Steyn', email: 'lucas.steyn@icloud.com', phone: '+27851234014', city: 'Knysna', country: 'ZA', stage: 'reviewed', priority: 42, adminNotes: 'Retired couple, lots of time for a dog. Farm near Knysna.', appOverrides: { livingType: 'farm', hasChildren: false, childrenAges: [], someoneHomeDuringDay: true } },
	{ id: 'client-015', firstName: 'Mia', lastName: 'Harmse', email: 'mia.harmse@gmail.com', phone: '+27861234015', city: 'Bellville', country: 'ZA', stage: 'reviewed', priority: 45, adminNotes: null, appOverrides: { preferredColour: 'Apricot' } },
	{ id: 'client-016', firstName: 'Elijah', lastName: 'van Rensburg', email: 'elijah.vanrensburg@gmail.com', phone: '+27871234016', city: 'Midrand', country: 'ZA', stage: 'enquiry', priority: 50, adminNotes: null, appOverrides: { readyTimeframe: '6_months' } },
	{ id: 'client-017', firstName: 'Harper', lastName: 'Smit', email: 'harper.smit@hotmail.com', phone: '+27881234017', city: 'Somerset West', country: 'ZA', stage: 'enquiry', priority: 52, adminNotes: null, appOverrides: { hasOtherPets: true, otherPetsDescription: 'One cat, very dog-friendly' } },
	{ id: 'client-018', firstName: 'Benjamin', lastName: 'Loots', email: 'benjamin.loots@gmail.com', phone: '+27891234018', city: 'Paarl', country: 'ZA', stage: 'enquiry', priority: 55, adminNotes: 'Reached out about Biewer Doodle. Send info pack.', appOverrides: { livingType: 'townhouse', preferredBreedSize: 'Small' } },
	{ id: 'client-019', firstName: 'Evelyn', lastName: 'Bezuidenhout', email: 'evelyn.bez@yahoo.com', phone: '+27821234019', city: 'Randburg', country: 'ZA', stage: 'enquiry', priority: 58, adminNotes: null, appOverrides: { preferredSex: 'female', considerOppositeSex: false } },
	{ id: 'client-020', firstName: 'Alexander', lastName: 'Pietersen', email: 'alex.pietersen@outlook.com', phone: '+27831234020', city: 'East London', country: 'ZA', stage: 'enquiry', priority: 60, adminNotes: null, appOverrides: {} },
	{ id: 'client-021', firstName: 'Abigail', lastName: 'de Villiers', email: 'abigail.devilliers@gmail.com', phone: '+27711234021', city: 'Cape Town', country: 'ZA', stage: 'waitlisted', priority: 33, adminNotes: 'Added to F1b waitlist. Very thorough application.', appOverrides: { allergiesToDogs: true, livingType: 'house' } },
	{ id: 'client-022', firstName: 'Jackson', lastName: 'Mostert', email: 'jackson.mostert@gmail.com', phone: '+27841234022', city: 'Pietermaritzburg', country: 'ZA', stage: 'waitlisted', priority: 36, adminNotes: null, appOverrides: { hasChildren: true, childrenAges: [8, 12, 15] } },
	{ id: 'client-023', firstName: 'Emily', lastName: 'Lourens', email: 'emily.lourens@icloud.com', phone: '+27851234023', city: 'Pretoria East', country: 'ZA', stage: 'placed', priority: 6, adminNotes: 'Placed puppy from Spring 2024 litter. Sent lovely photos at 6 months.', appOverrides: { readyTimeframe: 'asap', livingType: 'house' } },
	{ id: 'client-024', firstName: 'Sebastian', lastName: 'Engelbrecht', email: 'seb.engelbrecht@gmail.com', phone: '+27861234024', city: 'Hermanus', country: 'ZA', stage: 'placed', priority: 7, adminNotes: 'Placed from Spring 2024 litter. Active lifestyle, dog does agility now!', appOverrides: { activityLevel: 'Very active — hiking, running daily', livingType: 'house' } },
	{ id: 'client-025', firstName: 'Scarlett', lastName: 'Meyer', email: 'scarlett.meyer@yahoo.com', phone: '+27871234025', city: 'Johannesburg North', country: 'ZA', stage: 'declined', priority: 99, adminNotes: 'Declined — renting with no pet clause in lease. Friendly, advised to reapply when circumstances change.', appOverrides: { residenceOwnership: 'rent', neighbourhoodRestrictions: true } },
	{ id: 'client-026', firstName: 'Aiden', lastName: 'Potgieter', email: 'aiden.potgieter@gmail.com', phone: '+27881234026', city: 'Springs', country: 'ZA', stage: 'declined', priority: 99, adminNotes: 'Declined — works 12-hour shifts, puppy would be alone too long.', appOverrides: { hoursAlonePerDay: '10–12 hours', someoneHomeDuringDay: false } },
	{ id: 'client-027', firstName: 'Victoria', lastName: 'Rademeyer', email: 'victoria.rad@outlook.com', phone: '+27891234027', city: 'Centurion', country: 'ZA', stage: 'enquiry', priority: 65, adminNotes: null, appOverrides: { livingType: 'house', hasChildren: false, childrenAges: [] } },
	{ id: 'client-028', firstName: 'Daniel', lastName: 'van Zyl', email: 'daniel.vanzyl@gmail.com', phone: '+27821234028', city: 'Boksburg', country: 'ZA', stage: 'enquiry', priority: 68, adminNotes: null, appOverrides: { hasOtherPets: true, otherPetsDescription: 'Two small dogs, very friendly' } },
	{ id: 'client-029', firstName: 'Grace', lastName: 'Badenhorst', email: 'grace.badenhorst@gmail.com', phone: '+27831234029', city: 'Hartbeespoort', country: 'ZA', stage: 'waitlisted', priority: 29, adminNotes: 'Farm lifestyle, lots of space. Waiting on F1 litter.', appOverrides: { livingType: 'farm', yardSize: 'Large farm property with dams', hasGarden: true } },
	{ id: 'client-030', firstName: 'Henry', lastName: 'Schoeman', email: 'henry.schoeman@hotmail.com', phone: '+27711234030', city: 'Wilderness', country: 'ZA', stage: 'reviewed', priority: 48, adminNotes: null, appOverrides: { livingType: 'house', activityLevel: 'Active — beach walks daily' } },
];

// ─── Health cert seed data ────────────────────────────────────────────────────

function healthCertsForDog(dogId: string, dogName: string) {
	return [
		{ id: `hc-${dogId}-hips`, dogId, type: 'ofa_hips', result: 'excellent', certNumber: `OFA-HIPS-${dogId.toUpperCase()}`, issuedBy: 'OFA (Orthopedic Foundation for Animals)', issuedAt: '2023-06-15', expiresAt: null, notes: `${dogName} rated Excellent on bilateral hip evaluation.` },
		{ id: `hc-${dogId}-elbows`, dogId, type: 'ofa_elbows', result: 'pass', certNumber: `OFA-ELBOW-${dogId.toUpperCase()}`, issuedBy: 'OFA (Orthopedic Foundation for Animals)', issuedAt: '2023-06-15', expiresAt: null, notes: 'No evidence of elbow dysplasia.' },
		{ id: `hc-${dogId}-eyes`, dogId, type: 'ofa_eyes', result: 'pass', certNumber: `CAER-EYES-${dogId.toUpperCase()}`, issuedBy: 'CAER Certified Ophthalmologist', issuedAt: '2024-01-20', expiresAt: '2025-01-20', notes: 'Clear on CAER eye examination. No hereditary abnormalities.' },
		{ id: `hc-${dogId}-dna`, dogId, type: 'dna_panel', result: 'pass', certNumber: `DNA-${dogId.toUpperCase()}`, issuedBy: 'Embark Veterinary', issuedAt: '2023-03-10', expiresAt: null, notes: 'Clear/carrier status normal. Full panel tested and results normal.' },
	];
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function main() {
	console.log('🐾 Starting Paw Registry mock data seed...\n');

	// ── Step 1: Upload dog profile images ──────────────────────────────────────
	console.log('📸 Uploading dog profile images...');
	const dogImageUrls: Record<string, string> = {};

	for (const dog of DOGS) {
		try {
			console.log(`  → ${dog.name} (${dog.breed})`);
			const srcUrl = await fetchDogApiImageUrl(dog.apiBreed);
			const ext = srcUrl.split('.').pop()?.split('?')[0] || 'jpg';
			const storagePath = `seed/${dog.id}/profile.${ext}`;
			const publicUrl = await uploadImage('dog-images', storagePath, srcUrl);
			dogImageUrls[dog.id] = publicUrl;
			console.log(`     ✓ ${publicUrl}`);
		} catch (err) {
			console.error(`     ✗ Failed for ${dog.name}:`, err);
			dogImageUrls[dog.id] = '';
		}
	}

	// ── Step 2: Upload litter cover + gallery images ───────────────────────────
	console.log('\n📸 Uploading litter gallery images...');
	const litterCoverUrls: Record<string, string> = {};
	const litterGalleryUrls: Record<string, string[]> = {};

	for (const litter of LITTERS) {
		try {
			console.log(`  → ${litter.name}`);
			const imageUrls = await fetchDogApiImageUrls(litter.galleryBreed, 5);
			const uploaded: string[] = [];

			for (let i = 0; i < imageUrls.length; i++) {
				const srcUrl = imageUrls[i];
				const ext = srcUrl.split('.').pop()?.split('?')[0] || 'jpg';
				const storagePath = `seed/${litter.id}/gallery-${i}.${ext}`;
				const publicUrl = await uploadImage('litter-media', storagePath, srcUrl);
				uploaded.push(publicUrl);
				console.log(`     ✓ gallery-${i}: ${publicUrl}`);
			}

			litterCoverUrls[litter.id] = uploaded[0];
			litterGalleryUrls[litter.id] = uploaded.slice(1, 5); // 4 gallery images
		} catch (err) {
			console.error(`     ✗ Failed for ${litter.name}:`, err);
			litterCoverUrls[litter.id] = '';
			litterGalleryUrls[litter.id] = [];
		}
	}

	// ── Step 3: Insert dogs ────────────────────────────────────────────────────
	console.log('\n🐕 Inserting dogs...');

	for (const dog of DOGS) {
		await db`
			INSERT INTO dogs (
				id, name, call_name, registered_name, breed, sex, dob, colour, status,
				microchip_number, registration_number, profile_image_url, image_urls, notes,
				created_at, updated_at
			) VALUES (
				${dog.id}, ${dog.name}, ${dog.callName}, ${dog.registeredName},
				${dog.breed}, ${dog.sex}, ${dog.dob}, ${dog.colour}, ${dog.status},
				${dog.microchipNumber}, ${dog.registrationNumber},
				${dogImageUrls[dog.id] || null},
				${JSON.stringify([dogImageUrls[dog.id]].filter(Boolean))},
				${dog.notes},
				NOW(), NOW()
			)
			ON CONFLICT (id) DO UPDATE SET
				profile_image_url = EXCLUDED.profile_image_url,
				image_urls = EXCLUDED.image_urls,
				updated_at = NOW()
		`;
		console.log(`  ✓ ${dog.name} (${dog.breed})`);
	}

	// ── Step 4: Insert health certs ────────────────────────────────────────────
	console.log('\n🏥 Inserting health certificates...');

	for (const dog of DOGS) {
		const certs = healthCertsForDog(dog.id, dog.name);
		for (const cert of certs) {
			await db`
				INSERT INTO health_certs (
					id, dog_id, type, result, cert_number, issued_by, issued_at, expires_at, notes, created_at
				) VALUES (
					${cert.id}, ${cert.dogId}, ${cert.type}, ${cert.result},
					${cert.certNumber}, ${cert.issuedBy}, ${cert.issuedAt},
					${cert.expiresAt}, ${cert.notes}, NOW()
				)
				ON CONFLICT (id) DO NOTHING
			`;
		}
		console.log(`  ✓ ${dog.name}: ${certs.length} certs`);
	}

	// ── Step 5: Insert litters ─────────────────────────────────────────────────
	console.log('\n🐣 Inserting litters...');

	for (const litter of LITTERS) {
		await db`
			INSERT INTO litters (
				id, name, breed, sire_id, dam_id, status, whelp_date, expected_date,
				puppy_count, available_count, deposit_amount, purchase_price,
				notes, cover_image_url, is_public, created_at, updated_at
			) VALUES (
				${litter.id}, ${litter.name}, ${litter.breed},
				${litter.sireId}, ${litter.damId}, ${litter.status},
				${litter.whelpDate}, ${litter.expectedDate},
				${litter.puppyCount}, ${litter.availableCount},
				${litter.depositAmount}, ${litter.purchasePrice},
				${litter.notes},
				${litterCoverUrls[litter.id] || null},
				${litter.isPublic},
				NOW(), NOW()
			)
			ON CONFLICT (id) DO UPDATE SET
				cover_image_url = EXCLUDED.cover_image_url,
				updated_at = NOW()
		`;
		console.log(`  ✓ ${litter.name}`);
	}

	// ── Step 6: Insert litter gallery images ──────────────────────────────────
	console.log('\n🖼️  Inserting litter gallery images...');

	for (const litter of LITTERS) {
		const gallery = litterGalleryUrls[litter.id] || [];
		for (let i = 0; i < gallery.length; i++) {
			const url = gallery[i];
			const imageId = `limg-${litter.id}-${i + 1}`;
			const storagePath = `seed/${litter.id}/gallery-${i + 1}`;
			await db`
				INSERT INTO litter_images (id, litter_id, url, storage_path, sort_order, created_at)
				VALUES (${imageId}, ${litter.id}, ${url}, ${storagePath}, ${i + 1}, NOW())
				ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url
			`;
		}
		console.log(`  ✓ ${litter.name}: ${gallery.length} images`);
	}

	// ── Step 7: Insert clients ─────────────────────────────────────────────────
	console.log('\n👥 Inserting clients...');

	for (const client of CLIENTS) {
		const appData = mockAppData(client.appOverrides);
		await db`
			INSERT INTO clients (
				id, user_id, first_name, last_name, email, phone, city, country,
				stage, priority, application_data, admin_notes, created_at, updated_at
			) VALUES (
				${client.id}, NULL, ${client.firstName}, ${client.lastName},
				${client.email}, ${client.phone}, ${client.city}, ${client.country},
				${client.stage}, ${client.priority},
				${JSON.stringify(appData)},
				${client.adminNotes},
				NOW(), NOW()
			)
			ON CONFLICT (id) DO UPDATE SET
				stage = EXCLUDED.stage,
				admin_notes = EXCLUDED.admin_notes,
				updated_at = NOW()
		`;
		console.log(`  ✓ ${client.firstName} ${client.lastName} (${client.stage})`);
	}

	// ── Done ───────────────────────────────────────────────────────────────────
	console.log('\n✅ Seed complete!');
	console.log(`   Dogs:     ${DOGS.length}`);
	console.log(`   Litters:  ${LITTERS.length}`);
	console.log(`   Clients:  ${CLIENTS.length}`);

	await db.end();
	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
