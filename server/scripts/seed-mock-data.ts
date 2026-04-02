#!/usr/bin/env bun
/**
 * Mock data seed script for Paw Registry
 * — Wipes existing dogs, litters, puppies, clients and all dependent rows
 * — Downloads real dog images from dog.ceo API and uploads to Supabase Storage
 * — Inserts 10 dogs, 10 litters (with gallery), 33 puppies, 30 clients
 * — Seeds puppy_interests, litter_notifications, litter_interests, client_activity
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
	// ── Golden Retrievers (3 females — dams for F1 litters) ──────────────────
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
	// ── Standard Poodles (2 males — sires, 1 female) ─────────────────────────
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
	// ── Goldendoodles (1 female — dam for F1b, 1 male) ──────────────────────
	{
		id: 'dog-gd-001',
		name: 'Daisy',
		callName: 'Dais',
		registeredName: 'Sunridge Doodle Daisy',
		breed: 'F1 Goldendoodle',
		sex: 'female',
		dob: '2022-07-14',
		colour: 'Cream',
		status: 'active',
		microchipNumber: '953000123456007',
		registrationNumber: 'WWKC-GD-2022-007',
		notes: 'F1 Goldendoodle with gorgeous wavy low-shed coat. Exceptional family dog, great with children and other animals. Produces consistently wonderful puppies.',
		apiBreed: 'retriever/golden',
	},
	{
		id: 'dog-gd-002',
		name: 'Teddy',
		callName: 'Ted',
		registeredName: 'Sunridge Doodle Teddy',
		breed: 'F1 Goldendoodle',
		sex: 'male',
		dob: '2022-09-03',
		colour: 'Caramel',
		status: 'active',
		microchipNumber: '953000123456008',
		registrationNumber: 'WWKC-GD-2022-008',
		notes: 'F1 Goldendoodle with curly hypoallergenic coat. Very playful and outgoing, excellent temperament scores. Passed all health screenings.',
		apiBreed: 'retriever/golden',
	},
	// ── Border Collies (1 male, 1 female) ───────────────────────────────────
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
	// 1 — Completed (Spring 2024), not public
	{
		id: 'litter-f1gd-001',
		name: 'Spring 2024 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - standard',
		sireId: 'dog-p-001',
		damId: 'dog-gr-001',
		status: 'completed',
		whelpDate: '2024-04-15',
		expectedDate: '2024-04-10',
		puppyCount: 6,
		availableCount: 0,
		depositAmount: 3000,
		notes: 'Stunning litter of 6 — 4 females and 2 males. All matched and paid. Produced puppies in cream to golden colouring with wavy coats. Lovely families across the Western Cape.',
		isPublic: false,
		galleryBreed: 'retriever/golden',
	},
	// 2 — Available now (Winter 2025), public
	{
		id: 'litter-f1gd-002',
		name: 'Winter 2025 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - standard',
		sireId: 'dog-p-001',
		damId: 'dog-gr-002',
		status: 'available',
		whelpDate: '2025-12-01',
		expectedDate: '2025-11-28',
		puppyCount: 7,
		availableCount: 3,
		depositAmount: 3000,
		notes: 'Beautiful litter of 7 puppies ready to go home! Wavy to curly coats in apricot, cream, and golden. All vet-checked and microchipped. Three puppies still available.',
		isPublic: true,
		galleryBreed: 'retriever/golden',
	},
	// 3 — Born (Feb 2026), public
	{
		id: 'litter-f1gd-003',
		name: 'February 2026 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - miniature',
		sireId: 'dog-p-002',
		damId: 'dog-gr-003',
		status: 'born',
		whelpDate: '2026-02-10',
		expectedDate: '2026-02-07',
		puppyCount: 5,
		availableCount: 5,
		depositAmount: 3000,
		notes: 'New litter born February 2026! Pierre and Rosie have produced 3 males and 2 females. All healthy and feeding well. First progress photos at 3 weeks.',
		isPublic: true,
		galleryBreed: 'retriever/golden',
	},
	// 4 — Weaning (Jan 2026), public
	{
		id: 'litter-f1bgd-001',
		name: 'January 2026 F1b Goldendoodle Litter',
		breed: 'f1b_goldendoodle - standard',
		sireId: 'dog-p-001',
		damId: 'dog-gd-001',
		status: 'weaning',
		whelpDate: '2026-01-20',
		expectedDate: '2026-01-18',
		puppyCount: 6,
		availableCount: 5,
		depositAmount: 3500,
		notes: 'F1b litter producing ultra-low shedding puppies — ideal for allergy sufferers. Eyes are open and they\'re exploring the world! Curly coats in cream and apricot. One already matched.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
	// 5 — Confirmed (Apr 2026), public
	{
		id: 'litter-f1bgd-002',
		name: 'April 2026 F1b Goldendoodle Litter',
		breed: 'f1b_goldendoodle - miniature',
		sireId: 'dog-p-002',
		damId: 'dog-gd-001',
		status: 'confirmed',
		whelpDate: null,
		expectedDate: '2026-04-15',
		puppyCount: null,
		availableCount: null,
		depositAmount: 3500,
		notes: 'Confirmed pregnancy! Pierre and Daisy have produced exceptional puppies previously. Deposits now being accepted. Expected 5–7 puppies in curly, low-shedding coats.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
	// 6 — Planned (May 2026), public
	{
		id: 'litter-bwd-001',
		name: 'May 2026 Biewer Doodle Litter',
		breed: 'f1_mini_biewer_doodle - biewer_doodle',
		sireId: 'dog-p-002',
		damId: 'dog-gr-001',
		status: 'planned',
		whelpDate: null,
		expectedDate: '2026-05-20',
		puppyCount: null,
		availableCount: null,
		depositAmount: 4000,
		notes: 'Our first planned Biewer Doodle litter — registrations of interest now open! Limited availability expected. These tiny, tri-coloured gems will be exceptionally rare.',
		isPublic: true,
		galleryBreed: 'poodle/miniature',
	},
	// 7 — Born (Mar 2026), public
	{
		id: 'litter-bd-001',
		name: 'March 2026 Border Doodle Litter',
		breed: 'f1_border_doodle - border_doodle',
		sireId: 'dog-bc-001',
		damId: 'dog-p-003',
		status: 'born',
		whelpDate: '2026-03-05',
		expectedDate: '2026-03-01',
		puppyCount: 4,
		availableCount: 4,
		depositAmount: 3500,
		notes: 'Scout and Pearl have produced 4 beautiful border doodle puppies — 2 males, 2 females. Black & white, and merle colouring. Incredibly alert and bright from day one.',
		isPublic: true,
		galleryBreed: 'collie/border',
	},
	// 8 — Completed (Summer 2025), not public
	{
		id: 'litter-f1gd-004',
		name: 'Summer 2025 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - dwarf',
		sireId: 'dog-p-002',
		damId: 'dog-gr-001',
		status: 'completed',
		whelpDate: '2025-07-10',
		expectedDate: '2025-07-08',
		puppyCount: 5,
		availableCount: 0,
		depositAmount: 3000,
		notes: 'Dwarf F1 Goldendoodle litter — all puppies matched and paid. Pierre and Honey produced gorgeous compact pups with plush wavy coats in golden and cream shades.',
		isPublic: false,
		galleryBreed: 'retriever/golden',
	},
	// 9 — Planned (Jun 2026), public
	{
		id: 'litter-rtp-001',
		name: 'June 2026 Red Tuxedo French Poodle Litter',
		breed: 'red_tuxedo_french_poodle - standard_poodle',
		sireId: 'dog-p-001',
		damId: 'dog-p-003',
		status: 'planned',
		whelpDate: null,
		expectedDate: '2026-06-15',
		puppyCount: null,
		availableCount: null,
		depositAmount: 5000,
		notes: 'Our first pure-bred Red Tuxedo French Poodle litter. Duke and Pearl carry exceptional structure and colouring. Expected 4–6 puppies. Early registrations open.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
	// 10 — Planned (Aug 2026), public
	{
		id: 'litter-f1bgd-003',
		name: 'August 2026 F1b Goldendoodle Litter',
		breed: 'f1b_goldendoodle - dwarf',
		sireId: 'dog-p-002',
		damId: 'dog-gd-001',
		status: 'planned',
		whelpDate: null,
		expectedDate: '2026-08-10',
		puppyCount: null,
		availableCount: null,
		depositAmount: 3500,
		notes: 'Planned dwarf F1b litter from Pierre and Daisy. Compact, ultra-low shedding family companions. Register interest now for this highly anticipated combination.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
];

// ─── Puppy data ───────────────────────────────────────────────────────────────
// Statuses: available | reserved | matched | matched_paid | retained | not_for_sale
// reserved  → client expressed interest, admin approval pending (match_requested)
// matched   → admin approved interest, payment pending
// matched_paid → payment confirmed, puppy going home

const PUPPIES = [
	// litter-f1gd-001 (completed, 6 pups — all matched_paid)
	{ id: 'puppy-001', litterId: 'litter-f1gd-001', collarColour: 'Red', sex: 'female', colour: 'Cream', status: 'matched_paid', birthWeight: 320, currentWeight: 12500, notes: 'Matched & paid — went home to Emma van der Berg, Cape Town.' },
	{ id: 'puppy-002', litterId: 'litter-f1gd-001', collarColour: 'Blue', sex: 'female', colour: 'Golden', status: 'matched_paid', birthWeight: 340, currentWeight: 13200, notes: 'Matched & paid — went home to Emily Lourens, Pretoria East.' },
	{ id: 'puppy-003', litterId: 'litter-f1gd-001', collarColour: 'Green', sex: 'male', colour: 'Cream', status: 'matched_paid', birthWeight: 360, currentWeight: 14100, notes: 'Matched & paid — went home to Sebastian Engelbrecht, Hermanus.' },
	{ id: 'puppy-004', litterId: 'litter-f1gd-001', collarColour: 'Yellow', sex: 'female', colour: 'Light Golden', status: 'matched_paid', birthWeight: 310, currentWeight: 12800, notes: 'Matched & paid — went home to James Pretorius, Johannesburg.' },
	{ id: 'puppy-005', litterId: 'litter-f1gd-001', collarColour: 'Purple', sex: 'female', colour: 'Cream', status: 'matched_paid', birthWeight: 330, currentWeight: 12300, notes: 'Matched & paid — private client.' },
	{ id: 'puppy-006', litterId: 'litter-f1gd-001', collarColour: 'Orange', sex: 'male', colour: 'Golden', status: 'matched_paid', birthWeight: 370, currentWeight: 14500, notes: 'Matched & paid — private client.' },

	// litter-f1gd-002 (available, 7 pups)
	// puppy-007: matched (approved interest, Sophia)
	// puppy-008: reserved (pending interest, Elijah — match_requested)
	// puppy-009, 010, 013: available
	// puppy-011: reserved (pending interest, Clara — match_requested)
	// puppy-012: retained
	{ id: 'puppy-007', litterId: 'litter-f1gd-002', collarColour: 'Red', sex: 'female', colour: 'Apricot', status: 'matched', birthWeight: 310, currentWeight: 5200, notes: 'Matched to Sophia Nkosi. Payment confirmation pending.' },
	{ id: 'puppy-008', litterId: 'litter-f1gd-002', collarColour: 'Blue', sex: 'male', colour: 'Cream', status: 'reserved', birthWeight: 350, currentWeight: 5800, notes: 'Reserved — Elijah van Rensburg has expressed interest. Awaiting admin approval.' },
	{ id: 'puppy-009', litterId: 'litter-f1gd-002', collarColour: 'Green', sex: 'female', colour: 'Golden', status: 'available', birthWeight: 325, currentWeight: 5400, notes: null },
	{ id: 'puppy-010', litterId: 'litter-f1gd-002', collarColour: 'Yellow', sex: 'male', colour: 'Apricot', status: 'available', birthWeight: 340, currentWeight: 5600, notes: null },
	{ id: 'puppy-011', litterId: 'litter-f1gd-002', collarColour: 'Purple', sex: 'female', colour: 'Cream', status: 'reserved', birthWeight: 300, currentWeight: 5100, notes: 'Reserved — Clara Bosman has expressed interest. Awaiting admin approval.' },
	{ id: 'puppy-012', litterId: 'litter-f1gd-002', collarColour: 'Orange', sex: 'male', colour: 'Golden', status: 'retained', birthWeight: 365, currentWeight: 6000, notes: 'Retained for breeding evaluation.' },
	{ id: 'puppy-013', litterId: 'litter-f1gd-002', collarColour: 'Pink', sex: 'female', colour: 'Light Golden', status: 'available', birthWeight: 315, currentWeight: 5300, notes: null },

	// litter-f1gd-003 (born, 5 pups — all available)
	{ id: 'puppy-014', litterId: 'litter-f1gd-003', collarColour: 'Red', sex: 'male', colour: 'Cream', status: 'available', birthWeight: 290, currentWeight: 850, notes: 'Largest of the litter.' },
	{ id: 'puppy-015', litterId: 'litter-f1gd-003', collarColour: 'Blue', sex: 'male', colour: 'Apricot', status: 'available', birthWeight: 270, currentWeight: 780, notes: null },
	{ id: 'puppy-016', litterId: 'litter-f1gd-003', collarColour: 'Green', sex: 'male', colour: 'Golden', status: 'available', birthWeight: 280, currentWeight: 810, notes: null },
	{ id: 'puppy-017', litterId: 'litter-f1gd-003', collarColour: 'Yellow', sex: 'female', colour: 'Cream', status: 'available', birthWeight: 260, currentWeight: 740, notes: null },
	{ id: 'puppy-018', litterId: 'litter-f1gd-003', collarColour: 'Purple', sex: 'female', colour: 'Light Golden', status: 'available', birthWeight: 265, currentWeight: 760, notes: null },

	// litter-f1bgd-001 (weaning, 6 pups)
	// puppy-019: matched (approved interest, Liam)
	// puppy-020 to 024: available
	{ id: 'puppy-019', litterId: 'litter-f1bgd-001', collarColour: 'Red', sex: 'female', colour: 'Cream', status: 'matched', birthWeight: 280, currentWeight: 2200, notes: 'Matched to Liam Botha. Payment confirmation pending.' },
	{ id: 'puppy-020', litterId: 'litter-f1bgd-001', collarColour: 'Blue', sex: 'male', colour: 'Apricot', status: 'available', birthWeight: 300, currentWeight: 2500, notes: null },
	{ id: 'puppy-021', litterId: 'litter-f1bgd-001', collarColour: 'Green', sex: 'female', colour: 'Cream', status: 'available', birthWeight: 275, currentWeight: 2100, notes: null },
	{ id: 'puppy-022', litterId: 'litter-f1bgd-001', collarColour: 'Yellow', sex: 'male', colour: 'Cream', status: 'available', birthWeight: 295, currentWeight: 2400, notes: null },
	{ id: 'puppy-023', litterId: 'litter-f1bgd-001', collarColour: 'Purple', sex: 'female', colour: 'Apricot', status: 'available', birthWeight: 270, currentWeight: 2050, notes: null },
	{ id: 'puppy-024', litterId: 'litter-f1bgd-001', collarColour: 'Orange', sex: 'male', colour: 'Cream', status: 'available', birthWeight: 310, currentWeight: 2600, notes: null },

	// litter-f1gd-004 (completed, 5 pups — all matched_paid)
	{ id: 'puppy-025', litterId: 'litter-f1gd-004', collarColour: 'Red', sex: 'male', colour: 'Golden', status: 'matched_paid', birthWeight: 250, currentWeight: 8500, notes: 'Matched & paid — private client.' },
	{ id: 'puppy-026', litterId: 'litter-f1gd-004', collarColour: 'Blue', sex: 'female', colour: 'Cream', status: 'matched_paid', birthWeight: 235, currentWeight: 7800, notes: 'Matched & paid — private client.' },
	{ id: 'puppy-027', litterId: 'litter-f1gd-004', collarColour: 'Green', sex: 'female', colour: 'Light Golden', status: 'matched_paid', birthWeight: 240, currentWeight: 8100, notes: 'Matched & paid — private client.' },
	{ id: 'puppy-028', litterId: 'litter-f1gd-004', collarColour: 'Yellow', sex: 'male', colour: 'Cream', status: 'matched_paid', birthWeight: 260, currentWeight: 8900, notes: 'Matched & paid — private client.' },
	{ id: 'puppy-029', litterId: 'litter-f1gd-004', collarColour: 'Purple', sex: 'female', colour: 'Golden', status: 'matched_paid', birthWeight: 245, currentWeight: 8200, notes: 'Matched & paid — private client.' },

	// litter-bd-001 (born, 4 pups — all available)
	{ id: 'puppy-030', litterId: 'litter-bd-001', collarColour: 'Red', sex: 'male', colour: 'Black & White', status: 'available', birthWeight: 220, currentWeight: 480, notes: null },
	{ id: 'puppy-031', litterId: 'litter-bd-001', collarColour: 'Blue', sex: 'female', colour: 'Blue Merle', status: 'available', birthWeight: 210, currentWeight: 460, notes: null },
	{ id: 'puppy-032', litterId: 'litter-bd-001', collarColour: 'Green', sex: 'male', colour: 'Black & White', status: 'available', birthWeight: 225, currentWeight: 490, notes: null },
	{ id: 'puppy-033', litterId: 'litter-bd-001', collarColour: 'Yellow', sex: 'female', colour: 'Tri-colour', status: 'available', birthWeight: 205, currentWeight: 440, notes: null },
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
		preferredBreedSize: 'f1_goldendoodle - standard',
		secondChoiceBreedSize: null,
		considerOppositeSex: true,
		considerOtherColour: true,
		considerOtherBreedSize: false,
		considerRehome: false,
		...overrides,
	};
}

// 30 clients covering the full lifecycle
// Stages: matched_paid (4) | matched (2) | match_requested (2) | waitlisted (9) | approved (5) | enquired (6) | rejected (2)

const CLIENTS = [
	// ── Matched & Paid (4) — completed litters, puppy already at home ─────────
	{
		id: 'client-001',
		firstName: 'Emma', lastName: 'van der Berg',
		email: 'emma.vanderberg@gmail.com', phone: '+27821234001', city: 'Cape Town', country: 'ZA',
		stage: 'matched_paid', depositStatus: 'paid', priority: 5,
		puppyId: 'puppy-001', litterId: 'litter-f1gd-001',
		adminNotes: 'Wonderful family, very responsive. Collected Red Collar (Cream female) in June 2024.',
		appOverrides: { livingType: 'house', hasChildren: true, childrenAges: [7, 11], readyTimeframe: 'asap', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-002',
		firstName: 'James', lastName: 'Pretorius',
		email: 'james.pretorius@outlook.com', phone: '+27831234002', city: 'Johannesburg', country: 'ZA',
		stage: 'matched_paid', depositStatus: 'paid', priority: 8,
		puppyId: 'puppy-004', litterId: 'litter-f1gd-001',
		adminNotes: 'Single professional, works from home full time. Excellent match. Yellow Collar female collected.',
		appOverrides: { hasChildren: false, childrenAges: [], someoneHomeDuringDay: true, livingType: 'apartment', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-023',
		firstName: 'Emily', lastName: 'Lourens',
		email: 'emily.lourens@icloud.com', phone: '+27851234023', city: 'Pretoria East', country: 'ZA',
		stage: 'matched_paid', depositStatus: 'paid', priority: 6,
		puppyId: 'puppy-002', litterId: 'litter-f1gd-001',
		adminNotes: 'Blue Collar golden female from Spring 2024 litter. Sent lovely photos at 6 months.',
		appOverrides: { readyTimeframe: 'asap', livingType: 'house', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-024',
		firstName: 'Sebastian', lastName: 'Engelbrecht',
		email: 'seb.engelbrecht@gmail.com', phone: '+27861234024', city: 'Hermanus', country: 'ZA',
		stage: 'matched_paid', depositStatus: 'paid', priority: 7,
		puppyId: 'puppy-003', litterId: 'litter-f1gd-001',
		adminNotes: 'Green Collar cream male from Spring 2024. Active lifestyle, dog does agility now!',
		appOverrides: { activityLevel: 'Very active — hiking, running daily', livingType: 'house', preferredBreedSize: 'f1_goldendoodle - standard' },
	},

	// ── Matched (2) — puppy selected and approved, payment pending ────────────
	{
		id: 'client-003',
		firstName: 'Sophia', lastName: 'Nkosi',
		email: 'sophia.nkosi@yahoo.com', phone: '+27711234003', city: 'Pretoria', country: 'ZA',
		stage: 'matched', depositStatus: 'paid', priority: 12,
		puppyId: 'puppy-007', litterId: 'litter-f1gd-002',
		adminNotes: 'Matched to Red Collar apricot female (litter-f1gd-002). Final payment outstanding.',
		appOverrides: { preferredSex: 'female', preferredColour: 'Apricot', readyTimeframe: 'asap', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-004',
		firstName: 'Liam', lastName: 'Botha',
		email: 'liam.botha@gmail.com', phone: '+27841234004', city: 'Stellenbosch', country: 'ZA',
		stage: 'matched', depositStatus: 'paid', priority: 15,
		puppyId: 'puppy-019', litterId: 'litter-f1bgd-001',
		adminNotes: 'Matched to Red Collar cream female (litter-f1bgd-001). Wine farmer — large property.',
		appOverrides: { livingType: 'farm', yardSize: 'Large farm property', hasGarden: true, preferredBreedSize: 'f1b_goldendoodle - standard' },
	},

	// ── Match Requested (2) — expressed puppy interest, awaiting admin approval ─
	{
		id: 'client-032',
		firstName: 'Clara', lastName: 'Bosman',
		email: 'clara.bosman@gmail.com', phone: '+27731234032', city: 'Durbanville', country: 'ZA',
		stage: 'match_requested', depositStatus: 'paid', priority: 10,
		puppyId: null, litterId: 'litter-f1gd-002',
		adminNotes: 'Expressed interest in Purple Collar cream female (puppy-011). Notified for litter-f1gd-002. Approval pending.',
		appOverrides: { preferredSex: 'female', preferredColour: 'Cream', readyTimeframe: 'asap', preferredBreedSize: 'f1_goldendoodle - standard', considerOtherColour: false },
	},
	{
		id: 'client-016',
		firstName: 'Elijah', lastName: 'van Rensburg',
		email: 'elijah.vanrensburg@gmail.com', phone: '+27871234016', city: 'Midrand', country: 'ZA',
		stage: 'match_requested', depositStatus: 'none', priority: 50,
		puppyId: null, litterId: 'litter-f1gd-002',
		adminNotes: 'Expressed interest in Blue Collar cream male (puppy-008). Notified for litter-f1gd-002. Approval pending.',
		appOverrides: { readyTimeframe: '6_months', preferredBreedSize: 'f1_goldendoodle - standard' },
	},

	// ── Waitlisted — with deposit (4) ────────────────────────────────────────
	{
		id: 'client-005',
		firstName: 'Olivia', lastName: 'Coetzee',
		email: 'olivia.coetzee@icloud.com', phone: '+27851234005', city: 'Durban', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'paid', priority: 1,
		puppyId: null, litterId: null,
		adminNotes: 'Strong application, waiting on F1b litter. Very patient and communicative. Has flagged interest in upcoming litters.',
		appOverrides: { allergiesToDogs: true, preferredSex: 'female', preferredBreedSize: 'f1b_goldendoodle - standard', secondChoiceBreedSize: 'f1b_goldendoodle - miniature' },
	},
	{
		id: 'client-006',
		firstName: 'Noah', lastName: 'Fourie',
		email: 'noah.fourie@gmail.com', phone: '+27861234006', city: 'Port Elizabeth', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'paid', priority: 2,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { livingType: 'townhouse', hasChildren: false, childrenAges: [], preferredBreedSize: 'f1_goldendoodle - standard', secondChoiceBreedSize: 'f1_goldendoodle - miniature' },
	},
	{
		id: 'client-008',
		firstName: 'Ethan', lastName: 'du Plessis',
		email: 'ethan.duplessis@gmail.com', phone: '+27881234008', city: 'Cape Town', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'paid', priority: 3,
		puppyId: null, litterId: null,
		adminNotes: 'Deposit confirmed via EFT. Large family, wants standard F1.',
		appOverrides: { hasChildren: true, childrenAges: [3, 6, 10], preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-021',
		firstName: 'Abigail', lastName: 'de Villiers',
		email: 'abigail.devilliers@gmail.com', phone: '+27711234021', city: 'Cape Town', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'pending', priority: 4,
		puppyId: null, litterId: null,
		adminNotes: 'Added to F1b waitlist. Very thorough application. Deposit pending EFT confirmation.',
		appOverrides: { allergiesToDogs: true, livingType: 'house', preferredBreedSize: 'f1b_goldendoodle - standard', secondChoiceBreedSize: 'f1b_goldendoodle - dwarf' },
	},

	// ── Waitlisted — no deposit (5) ───────────────────────────────────────────
	{
		id: 'client-007',
		firstName: 'Ava', lastName: 'Swanepoel',
		email: 'ava.swanepoel@yahoo.com', phone: '+27871234007', city: 'Bloemfontein', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'none', priority: 10,
		puppyId: null, litterId: null,
		adminNotes: 'Waiting on Biewer Doodle litter. Very excited, has done extensive research on the breed.',
		appOverrides: { preferredBreedSize: 'f1_mini_biewer_doodle - biewer_doodle', livingType: 'house' },
	},
	{
		id: 'client-009',
		firstName: 'Isabella', lastName: 'Kruger',
		email: 'isabella.kruger@hotmail.com', phone: '+27891234009', city: 'Johannesburg', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'none', priority: 11,
		puppyId: null, litterId: null,
		adminNotes: 'Allergic to shedding breeds. Very keen on F1b. Follow up regarding timeline.',
		appOverrides: { allergiesToDogs: true, readyTimeframe: '6_months', preferredBreedSize: 'f1b_goldendoodle - miniature', secondChoiceBreedSize: 'f1b_goldendoodle - standard' },
	},
	{
		id: 'client-010',
		firstName: 'Mason', lastName: 'van Wyk',
		email: 'mason.vanwyk@gmail.com', phone: '+27821234010', city: 'Centurion', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'none', priority: 12,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { livingType: 'house', hasGarden: true, preferredBreedSize: 'f1_goldendoodle - miniature', secondChoiceBreedSize: 'f1_goldendoodle - dwarf' },
	},
	{
		id: 'client-029',
		firstName: 'Grace', lastName: 'Badenhorst',
		email: 'grace.badenhorst@gmail.com', phone: '+27831234029', city: 'Hartbeespoort', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'none', priority: 14,
		puppyId: null, litterId: null,
		adminNotes: 'Farm lifestyle, lots of space. Waiting on F1 standard litter.',
		appOverrides: { livingType: 'farm', yardSize: 'Large farm property with dams', hasGarden: true, preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-031',
		firstName: 'Zara', lastName: 'Malan',
		email: 'zara.malan@gmail.com', phone: '+27821234031', city: 'Franschhoek', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'none', priority: 15,
		puppyId: null, litterId: null,
		adminNotes: 'Wants a border doodle. Active runner, lives near hiking trails.',
		appOverrides: { preferredBreedSize: 'f1_border_doodle - border_doodle', activityLevel: 'Very active — trail running and hiking', livingType: 'house' },
	},

	// ── Approved (5) — application reviewed, not yet waitlisted ─────────────
	{
		id: 'client-011',
		firstName: 'Charlotte', lastName: 'Nel',
		email: 'charlotte.nel@outlook.com', phone: '+27831234011', city: 'Sandton', country: 'ZA',
		stage: 'approved', depositStatus: 'none', priority: 35,
		puppyId: null, litterId: null,
		adminNotes: 'Application reviewed. Good fit for F1 miniature. Will contact when litter-f1gd-003 is ready.',
		appOverrides: { preferredSex: 'male', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-012',
		firstName: 'Logan', lastName: 'Viljoen',
		email: 'logan.viljoen@gmail.com', phone: '+27711234012', city: 'Roodepoort', country: 'ZA',
		stage: 'approved', depositStatus: 'none', priority: 38,
		puppyId: null, litterId: null,
		adminNotes: 'Reviewed — lives in a complex, confirmed pet-friendly lease.',
		appOverrides: { livingType: 'apartment', residenceOwnership: 'rent', preferredBreedSize: 'f1_goldendoodle - miniature' },
	},
	{
		id: 'client-013',
		firstName: 'Amelia', lastName: 'Joubert',
		email: 'amelia.joubert@yahoo.com', phone: '+27841234013', city: 'George', country: 'ZA',
		stage: 'approved', depositStatus: 'none', priority: 40,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { livingType: 'house', hasChildren: true, childrenAges: [2, 5], preferredBreedSize: 'f1b_goldendoodle - miniature', secondChoiceBreedSize: 'f1_goldendoodle - miniature' },
	},
	{
		id: 'client-014',
		firstName: 'Lucas', lastName: 'Steyn',
		email: 'lucas.steyn@icloud.com', phone: '+27851234014', city: 'Knysna', country: 'ZA',
		stage: 'approved', depositStatus: 'none', priority: 42,
		puppyId: null, litterId: null,
		adminNotes: 'Retired couple, lots of time for a dog. Farm near Knysna.',
		appOverrides: { livingType: 'farm', hasChildren: false, childrenAges: [], someoneHomeDuringDay: true, preferredBreedSize: 'f1_goldendoodle - standard', secondChoiceBreedSize: 'red_tuxedo_french_poodle - standard_poodle' },
	},
	{
		id: 'client-015',
		firstName: 'Mia', lastName: 'Harmse',
		email: 'mia.harmse@gmail.com', phone: '+27861234015', city: 'Bellville', country: 'ZA',
		stage: 'approved', depositStatus: 'none', priority: 45,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { preferredColour: 'Apricot', preferredBreedSize: 'f1_goldendoodle - dwarf', secondChoiceBreedSize: 'f1b_goldendoodle - dwarf' },
	},

	// ── Enquired (6) — new applications ──────────────────────────────────────
	{
		id: 'client-017',
		firstName: 'Harper', lastName: 'Smit',
		email: 'harper.smit@hotmail.com', phone: '+27881234017', city: 'Somerset West', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 52,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { hasOtherPets: true, otherPetsDescription: 'One cat, very dog-friendly', preferredBreedSize: 'f1b_goldendoodle - miniature' },
	},
	{
		id: 'client-018',
		firstName: 'Benjamin', lastName: 'Loots',
		email: 'benjamin.loots@gmail.com', phone: '+27891234018', city: 'Paarl', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 55,
		puppyId: null, litterId: null,
		adminNotes: 'Reached out about Biewer Doodle. Send info pack.',
		appOverrides: { livingType: 'townhouse', preferredBreedSize: 'f1_mini_biewer_doodle - biewer_doodle' },
	},
	{
		id: 'client-019',
		firstName: 'Evelyn', lastName: 'Bezuidenhout',
		email: 'evelyn.bez@yahoo.com', phone: '+27821234019', city: 'Randburg', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 58,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { preferredSex: 'female', considerOppositeSex: false, preferredBreedSize: 'f1_goldendoodle - miniature' },
	},
	{
		id: 'client-020',
		firstName: 'Alexander', lastName: 'Pietersen',
		email: 'alex.pietersen@outlook.com', phone: '+27831234020', city: 'East London', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 60,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { preferredBreedSize: 'f1_goldendoodle - standard', secondChoiceBreedSize: 'f1_goldendoodle - miniature' },
	},
	{
		id: 'client-027',
		firstName: 'Victoria', lastName: 'Rademeyer',
		email: 'victoria.rad@outlook.com', phone: '+27891234027', city: 'Centurion', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 65,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { livingType: 'house', hasChildren: false, childrenAges: [], preferredBreedSize: 'red_tuxedo_french_poodle - moyen_poodle' },
	},
	{
		id: 'client-028',
		firstName: 'Daniel', lastName: 'van Zyl',
		email: 'daniel.vanzyl@gmail.com', phone: '+27821234028', city: 'Boksburg', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 68,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { hasOtherPets: true, otherPetsDescription: 'Two small dogs, very friendly', preferredBreedSize: 'f1_goldendoodle - dwarf' },
	},

	// ── Rejected (2) ────────────────────────────────────────────────────────
	{
		id: 'client-025',
		firstName: 'Scarlett', lastName: 'Meyer',
		email: 'scarlett.meyer@yahoo.com', phone: '+27871234025', city: 'Johannesburg North', country: 'ZA',
		stage: 'rejected', depositStatus: 'none', priority: 99,
		puppyId: null, litterId: null,
		adminNotes: 'Rejected — renting with no pet clause in lease. Friendly, advised to reapply when circumstances change.',
		appOverrides: { residenceOwnership: 'rent', neighbourhoodRestrictions: true, preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-026',
		firstName: 'Aiden', lastName: 'Potgieter',
		email: 'aiden.potgieter@gmail.com', phone: '+27881234026', city: 'Springs', country: 'ZA',
		stage: 'rejected', depositStatus: 'none', priority: 99,
		puppyId: null, litterId: null,
		adminNotes: 'Rejected — works 12-hour shifts, puppy would be alone too long.',
		appOverrides: { hoursAlonePerDay: '10–12 hours', someoneHomeDuringDay: false, preferredBreedSize: 'f1b_goldendoodle - standard' },
	},
];

// ─── Litter notifications ─────────────────────────────────────────────────────
// Records who was formally invited to express puppy interest per litter

const LITTER_NOTIFICATIONS = [
	// litter-f1gd-002 (available) — top 5 waitlisted clients were invited
	{ id: 'lnotif-001', litterId: 'litter-f1gd-002', clientId: 'client-003' }, // Sophia (matched)
	{ id: 'lnotif-002', litterId: 'litter-f1gd-002', clientId: 'client-032' }, // Clara (match_requested)
	{ id: 'lnotif-003', litterId: 'litter-f1gd-002', clientId: 'client-016' }, // Elijah (match_requested)
	{ id: 'lnotif-004', litterId: 'litter-f1gd-002', clientId: 'client-005' }, // Olivia (waitlisted, invited but hasn't acted)
	{ id: 'lnotif-005', litterId: 'litter-f1gd-002', clientId: 'client-006' }, // Noah (waitlisted, invited but hasn't acted)
	// litter-f1bgd-001 (weaning) — top 3 invited
	{ id: 'lnotif-006', litterId: 'litter-f1bgd-001', clientId: 'client-004' }, // Liam (matched)
	{ id: 'lnotif-007', litterId: 'litter-f1bgd-001', clientId: 'client-005' }, // Olivia (invited, hasn't acted)
	{ id: 'lnotif-008', litterId: 'litter-f1bgd-001', clientId: 'client-006' }, // Noah (invited, hasn't acted)
];

// ─── Puppy interests ──────────────────────────────────────────────────────────
// Tracks which client expressed interest in which puppy
// status: approved (→ client=matched, puppy=matched) | pending (→ client=match_requested, puppy=reserved)

const PUPPY_INTERESTS = [
	// Approved — puppy matched, client matched
	{ id: 'pint-001', puppyId: 'puppy-007', clientId: 'client-003', status: 'approved', notes: 'Sophia selected the Apricot female. Approved by admin 28 Mar 2026.' },
	{ id: 'pint-002', puppyId: 'puppy-019', clientId: 'client-004', status: 'approved', notes: 'Liam selected the Cream female. Approved by admin 01 Apr 2026.' },
	// Pending — puppy reserved, client match_requested
	{ id: 'pint-003', puppyId: 'puppy-011', clientId: 'client-032', status: 'pending', notes: 'Clara expressed interest in Purple Collar Cream female. Awaiting admin review.' },
	{ id: 'pint-004', puppyId: 'puppy-008', clientId: 'client-016', status: 'pending', notes: 'Elijah expressed interest in Blue Collar Cream male. Awaiting admin review.' },
];

// ─── Litter interests ─────────────────────────────────────────────────────────
// Informational — waitlisted+ clients flagging interest in a litter (no stage change)

const LITTER_INTERESTS = [
	// Olivia (waitlisted, F1b) — interested in both upcoming F1b litters
	{ id: 'lint-001', clientId: 'client-005', litterId: 'litter-f1bgd-001' },
	{ id: 'lint-002', clientId: 'client-005', litterId: 'litter-f1bgd-002' },
	// Noah (waitlisted, F1 standard) — interested in born F1 miniature litter
	{ id: 'lint-003', clientId: 'client-006', litterId: 'litter-f1gd-003' },
	// Ava (waitlisted, Biewer Doodle) — interested in the planned Biewer litter
	{ id: 'lint-004', clientId: 'client-007', litterId: 'litter-bwd-001' },
	// Isabella (waitlisted, F1b miniature) — interested in confirmed F1b litter
	{ id: 'lint-005', clientId: 'client-009', litterId: 'litter-f1bgd-002' },
	// Mason (waitlisted, F1 miniature) — interested in born F1 miniature litter
	{ id: 'lint-006', clientId: 'client-010', litterId: 'litter-f1gd-003' },
	// Grace (waitlisted, F1 standard) — interested in born F1 miniature litter
	{ id: 'lint-007', clientId: 'client-029', litterId: 'litter-f1gd-003' },
	// Zara (waitlisted, Border Doodle) — interested in the Border Doodle litter
	{ id: 'lint-008', clientId: 'client-031', litterId: 'litter-bd-001' },
];

// ─── Activity events ──────────────────────────────────────────────────────────

function activityEventsForClient(client: typeof CLIENTS[0]) {
	const events: Array<{ type: string; description: string; actor: string; metadata: Record<string, unknown> }> = [];

	events.push({
		type: 'application_submitted',
		description: 'Application submitted via online form.',
		actor: 'client',
		metadata: {},
	});

	// Stage progression — no placed stage
	const stageOrder = ['enquired', 'approved', 'waitlisted', 'match_requested', 'matched', 'matched_paid'];
	const currentIndex = stageOrder.indexOf(client.stage);

	if (currentIndex >= 1) {
		events.push({ type: 'stage_changed', description: 'Application reviewed and approved by admin.', actor: 'admin', metadata: { from: 'enquired', to: 'approved' } });
	}
	if (currentIndex >= 2) {
		events.push({ type: 'stage_changed', description: 'All required documents verified. Client moved to waitlist.', actor: 'system', metadata: { from: 'approved', to: 'waitlisted' } });
	}
	if (currentIndex >= 3) {
		events.push({ type: 'stage_changed', description: 'Client notified for a litter and expressed interest in a puppy.', actor: 'client', metadata: { from: 'waitlisted', to: 'match_requested', litterId: client.litterId } });
	}
	if (currentIndex >= 4) {
		events.push({ type: 'stage_changed', description: 'Puppy interest approved by admin.', actor: 'admin', metadata: { from: 'match_requested', to: 'matched', puppyId: client.puppyId } });
	}
	if (currentIndex >= 5) {
		events.push({ type: 'stage_changed', description: 'Full payment received. Puppy confirmed and ready to go home.', actor: 'admin', metadata: { from: 'matched', to: 'matched_paid' } });
	}

	if (client.stage === 'rejected') {
		events.push({ type: 'stage_changed', description: 'Application rejected. Reason noted in admin notes.', actor: 'admin', metadata: { from: 'enquired', to: 'rejected' } });
	}

	if (client.depositStatus === 'pending') {
		events.push({ type: 'deposit_changed', description: 'Client expressed intent to pay deposit.', actor: 'client', metadata: { from: 'none', to: 'pending' } });
	}
	if (client.depositStatus === 'paid') {
		events.push({ type: 'deposit_changed', description: 'Client expressed intent to pay deposit.', actor: 'client', metadata: { from: 'none', to: 'pending' } });
		events.push({ type: 'deposit_changed', description: 'Deposit payment confirmed by admin.', actor: 'admin', metadata: { from: 'pending', to: 'paid' } });
	}

	if (client.adminNotes) {
		events.push({ type: 'notes_updated', description: 'Admin notes updated.', actor: 'admin', metadata: {} });
	}

	return events;
}

// ─── Health certs ─────────────────────────────────────────────────────────────

function healthCertsForDog(dogId: string, dogName: string) {
	return [
		{ id: `hc-${dogId}-hips`, dogId, type: 'ofa_hips', result: 'excellent', certNumber: `OFA-HIPS-${dogId.toUpperCase()}`, issuedBy: 'OFA (Orthopedic Foundation for Animals)', issuedAt: '2023-06-15', expiresAt: null, notes: `${dogName} rated Excellent on bilateral hip evaluation.` },
		{ id: `hc-${dogId}-elbows`, dogId, type: 'ofa_elbows', result: 'pass', certNumber: `OFA-ELBOW-${dogId.toUpperCase()}`, issuedBy: 'OFA (Orthopedic Foundation for Animals)', issuedAt: '2023-06-15', expiresAt: null, notes: 'No evidence of elbow dysplasia.' },
		{ id: `hc-${dogId}-eyes`, dogId, type: 'ofa_eyes', result: 'pass', certNumber: `CAER-EYES-${dogId.toUpperCase()}`, issuedBy: 'CAER Certified Ophthalmologist', issuedAt: '2024-01-20', expiresAt: '2025-01-20', notes: 'Clear on CAER eye examination. No hereditary abnormalities.' },
		{ id: `hc-${dogId}-dna`, dogId, type: 'dna_panel', result: 'pass', certNumber: `DNA-${dogId.toUpperCase()}`, issuedBy: 'Embark Veterinary', issuedAt: '2023-03-10', expiresAt: null, notes: 'Clear/carrier status normal. Full panel tested and results normal.' },
	];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log('🐾 Starting Paw Registry seed...\n');

	// ── Step 0: Wipe existing data ─────────────────────────────────────────────
	console.log('🗑️  Wiping existing data...');
	// Delete in dependency order to avoid FK violations
	await db`DELETE FROM litter_interests`;
	await db`DELETE FROM puppy_interests`;
	await db`DELETE FROM litter_notifications`;
	await db`DELETE FROM client_activity`;
	await db`DELETE FROM go_home_checklists`;
	await db`DELETE FROM documents`;
	await db`DELETE FROM client_template_checklist`;
	await db`DELETE FROM email_logs`;
	await db`DELETE FROM updates`;
	await db`DELETE FROM litter_images`;
	// Clear FK references before deleting parents
	await db`UPDATE clients SET puppy_id = NULL, litter_id = NULL`;
	await db`DELETE FROM clients`;
	await db`DELETE FROM puppies`;
	await db`DELETE FROM health_certs`;
	await db`DELETE FROM litters`;
	await db`DELETE FROM dogs`;
	console.log('  ✓ All data cleared\n');

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

	// ── Step 2: Upload litter gallery images ───────────────────────────────────
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
				console.log(`     ✓ gallery-${i}`);
			}

			litterCoverUrls[litter.id] = uploaded[0];
			litterGalleryUrls[litter.id] = uploaded.slice(1, 5);
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
				puppy_count, available_count, deposit_amount,
				notes, cover_image_url, is_public, created_at, updated_at
			) VALUES (
				${litter.id}, ${litter.name}, ${litter.breed},
				${litter.sireId}, ${litter.damId}, ${litter.status},
				${litter.whelpDate}, ${litter.expectedDate},
				${litter.puppyCount}, ${litter.availableCount},
				${litter.depositAmount},
				${litter.notes},
				${litterCoverUrls[litter.id] || null},
				${litter.isPublic},
				NOW(), NOW()
			)
		`;
		console.log(`  ✓ ${litter.name} (${litter.status})`);
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
			`;
		}
		if (gallery.length) console.log(`  ✓ ${litter.name}: ${gallery.length} images`);
	}

	// ── Step 7: Insert puppies ────────────────────────────────────────────────
	console.log('\n🐶 Inserting puppies...');

	for (const puppy of PUPPIES) {
		await db`
			INSERT INTO puppies (
				id, litter_id, dog_id, collar_colour, sex, colour, status,
				birth_weight, current_weight, notes, profile_image_url,
				created_at, updated_at
			) VALUES (
				${puppy.id}, ${puppy.litterId}, NULL, ${puppy.collarColour},
				${puppy.sex}, ${puppy.colour}, ${puppy.status},
				${puppy.birthWeight}, ${puppy.currentWeight}, ${puppy.notes},
				NULL, NOW(), NOW()
			)
		`;
		console.log(`  ✓ ${puppy.collarColour} collar ${puppy.sex} (${puppy.status}) → ${puppy.litterId}`);
	}

	// ── Step 8: Insert clients ─────────────────────────────────────────────────
	console.log('\n👥 Inserting clients...');

	for (const client of CLIENTS) {
		const appData = mockAppData(client.appOverrides);
		await db`
			INSERT INTO clients (
				id, user_id, first_name, last_name, email, phone, city, country,
				stage, priority, deposit_status, puppy_id, litter_id,
				application_data, admin_notes, created_at, updated_at
			) VALUES (
				${client.id}, NULL, ${client.firstName}, ${client.lastName},
				${client.email}, ${client.phone}, ${client.city}, ${client.country},
				${client.stage}, ${client.priority}, ${client.depositStatus},
				${client.puppyId}, ${client.litterId},
				${JSON.stringify(appData)},
				${client.adminNotes},
				NOW(), NOW()
			)
		`;
		console.log(`  ✓ ${client.firstName} ${client.lastName} — ${client.stage} / deposit: ${client.depositStatus}`);
	}

	// ── Step 9: Insert client activity events ─────────────────────────────────
	console.log('\n📋 Inserting client activity...');
	let totalActivity = 0;

	for (const client of CLIENTS) {
		const events = activityEventsForClient(client);
		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			const eventId = `act-${client.id}-${i + 1}`;
			const offsetMinutes = (events.length - i) * 1440;
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
		console.log(`  ✓ ${client.firstName} ${client.lastName}: ${events.length} events`);
	}

	// ── Step 10: Insert litter notifications ──────────────────────────────────
	console.log('\n🔔 Inserting litter notifications...');

	for (const notif of LITTER_NOTIFICATIONS) {
		await db`
			INSERT INTO litter_notifications (id, litter_id, client_id, notified_at, created_at)
			VALUES (${notif.id}, ${notif.litterId}, ${notif.clientId}, NOW(), NOW())
		`;
		console.log(`  ✓ ${notif.clientId} notified for ${notif.litterId}`);
	}

	// ── Step 11: Insert puppy interests ───────────────────────────────────────
	console.log('\n🐾 Inserting puppy interests...');

	for (const interest of PUPPY_INTERESTS) {
		await db`
			INSERT INTO puppy_interests (id, puppy_id, client_id, status, notes, created_at, updated_at)
			VALUES (
				${interest.id}, ${interest.puppyId}, ${interest.clientId},
				${interest.status}, ${interest.notes}, NOW(), NOW()
			)
		`;
		console.log(`  ✓ ${interest.clientId} → ${interest.puppyId} (${interest.status})`);
	}

	// ── Step 12: Insert litter interests ──────────────────────────────────────
	console.log('\n⭐ Inserting litter interests...');

	for (const interest of LITTER_INTERESTS) {
		await db`
			INSERT INTO litter_interests (id, client_id, litter_id, created_at, updated_at)
			VALUES (${interest.id}, ${interest.clientId}, ${interest.litterId}, NOW(), NOW())
		`;
		console.log(`  ✓ ${interest.clientId} interested in ${interest.litterId}`);
	}

	// ── Done ──────────────────────────────────────────────────────────────────
	console.log('\n✅ Seed complete!');
	console.log(`   Dogs:                ${DOGS.length}`);
	console.log(`   Litters:             ${LITTERS.length}`);
	console.log(`   Puppies:             ${PUPPIES.length}`);
	console.log(`   Clients:             ${CLIENTS.length}`);
	console.log(`     matched_paid:      ${CLIENTS.filter(c => c.stage === 'matched_paid').length}`);
	console.log(`     matched:           ${CLIENTS.filter(c => c.stage === 'matched').length}`);
	console.log(`     match_requested:   ${CLIENTS.filter(c => c.stage === 'match_requested').length}`);
	console.log(`     waitlisted:        ${CLIENTS.filter(c => c.stage === 'waitlisted').length}`);
	console.log(`     approved:          ${CLIENTS.filter(c => c.stage === 'approved').length}`);
	console.log(`     enquired:          ${CLIENTS.filter(c => c.stage === 'enquired').length}`);
	console.log(`     rejected:          ${CLIENTS.filter(c => c.stage === 'rejected').length}`);
	console.log(`   Litter notifications: ${LITTER_NOTIFICATIONS.length}`);
	console.log(`   Puppy interests:     ${PUPPY_INTERESTS.length}`);
	console.log(`   Litter interests:    ${LITTER_INTERESTS.length}`);
	console.log(`   Activity events:     ${totalActivity}`);

	await db.end();
	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
