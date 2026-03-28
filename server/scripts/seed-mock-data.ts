#!/usr/bin/env bun
/**
 * Mock data seed script for Paw Registry
 * — Downloads real dog images from dog.ceo API
 * — Uploads them to Supabase Storage buckets
 * — Inserts 10 dogs, 10 litters (with gallery images), puppies, 30 clients, activity events
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
// breed field uses the shared key format from BREEDS + BREED_SIZES: "breed_key - size_key"
// These values are set via dropdown in the UI and stored with buildBreedSize()

const LITTERS = [
	// 1 — Completed, public=false
	{
		id: 'litter-f1gd-001',
		name: 'Spring 2024 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - standard',       // Standard Goldendoodle
		sireId: 'dog-p-001',
		damId: 'dog-gr-001',
		status: 'completed',
		whelpDate: '2024-04-15',
		expectedDate: '2024-04-10',
		puppyCount: 6,
		availableCount: 0,
		depositAmount: 3000,
		notes: 'Stunning litter of 6 with excellent temperaments — 4 females and 2 males. All placed to loving homes. Produced puppies in cream to golden colouring with wavy coats.',
		isPublic: false,
		galleryBreed: 'retriever/golden',
	},
	// 2 — Ready, public=true
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
		notes: 'Beautiful litter of 7 puppies ready to go to their forever homes! Wavy to curly coats in apricot, cream, and golden. All vet-checked and microchipped.',
		isPublic: true,
		galleryBreed: 'retriever/golden',
	},
	// 3 — Born, public=true
	{
		id: 'litter-f1gd-003',
		name: 'February 2026 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - miniature',      // Miniature Goldendoodle
		sireId: 'dog-p-002',
		damId: 'dog-gr-003',
		status: 'born',
		whelpDate: '2026-02-10',
		expectedDate: '2026-02-07',
		puppyCount: 5,
		availableCount: 5,
		depositAmount: 3000,
		notes: 'New litter born February 2026! Pierre and Rosie have produced 3 males and 2 females. All are healthy and feeding well. First progress photos at 3 weeks.',
		isPublic: true,
		galleryBreed: 'retriever/golden',
	},
	// 4 — Weaning, public=true
	{
		id: 'litter-f1bgd-001',
		name: 'January 2026 F1b Goldendoodle Litter',
		breed: 'f1b_goldendoodle - standard',      // F1b Standard
		sireId: 'dog-p-001',
		damId: 'dog-gd-001',
		status: 'weaning',
		whelpDate: '2026-01-20',
		expectedDate: '2026-01-18',
		puppyCount: 6,
		availableCount: 4,
		depositAmount: 3500,
		notes: 'F1b litter producing ultra-low shedding puppies — ideal for allergy sufferers. Eyes are open and they are exploring the world! Curly coats in cream and apricot.',
		isPublic: true,
		galleryBreed: 'poodle/standard',
	},
	// 5 — Confirmed, public=true
	{
		id: 'litter-f1bgd-002',
		name: 'April 2026 F1b Goldendoodle Litter',
		breed: 'f1b_goldendoodle - miniature',     // F1b Miniature
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
	// 6 — Planned, public=true (Biewer Doodle)
	{
		id: 'litter-bwd-001',
		name: 'May 2026 Biewer Doodle Litter',
		breed: 'f1_mini_biewer_doodle - biewer_doodle', // Mini Biewer Doodle
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
	// 7 — Born, Border Doodle, public=true
	{
		id: 'litter-bd-001',
		name: 'March 2026 Border Doodle Litter',
		breed: 'f1_border_doodle - border_doodle', // Border Doodle
		sireId: 'dog-bc-001',
		damId: 'dog-p-003',
		status: 'born',
		whelpDate: '2026-03-05',
		expectedDate: '2026-03-01',
		puppyCount: 4,
		availableCount: 3,
		depositAmount: 3500,
		notes: 'Scout and Pearl have produced 4 beautiful border doodle puppies — 2 males, 2 females. Black & white, and merle colouring. Incredibly alert and bright from day one.',
		isPublic: true,
		galleryBreed: 'collie/border',
	},
	// 8 — Completed, Dwarf Goldendoodle, public=false
	{
		id: 'litter-f1gd-004',
		name: 'Summer 2025 F1 Goldendoodle Litter',
		breed: 'f1_goldendoodle - dwarf',          // Dwarf Goldendoodle
		sireId: 'dog-p-002',
		damId: 'dog-gr-001',
		status: 'completed',
		whelpDate: '2025-07-10',
		expectedDate: '2025-07-08',
		puppyCount: 5,
		availableCount: 0,
		depositAmount: 3000,
		notes: 'Dwarf F1 Goldendoodle litter — all puppies placed. Pierre and Honey produced gorgeous compact pups with plush wavy coats in golden and cream shades.',
		isPublic: false,
		galleryBreed: 'retriever/golden',
	},
	// 9 — Planned, Red Tuxedo French Poodle, public=true
	{
		id: 'litter-rtp-001',
		name: 'June 2026 Red Tuxedo French Poodle Litter',
		breed: 'red_tuxedo_french_poodle - standard_poodle', // Standard Poodle
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
	// 10 — Planned, F1b Dwarf, public=true
	{
		id: 'litter-f1bgd-003',
		name: 'August 2026 F1b Goldendoodle Litter',
		breed: 'f1b_goldendoodle - dwarf',         // F1b Dwarf
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
// Only for litters with status born, weaning, available, or completed

const PUPPIES = [
	// litter-f1gd-001 (completed, 6 pups – all placed)
	{ id: 'puppy-001', litterId: 'litter-f1gd-001', collarColour: 'Red', sex: 'female', colour: 'Cream', status: 'placed', birthWeight: 320, currentWeight: 12500, notes: 'Placed with Emma van der Berg' },
	{ id: 'puppy-002', litterId: 'litter-f1gd-001', collarColour: 'Blue', sex: 'female', colour: 'Golden', status: 'placed', birthWeight: 340, currentWeight: 13200, notes: 'Placed with Emily Lourens' },
	{ id: 'puppy-003', litterId: 'litter-f1gd-001', collarColour: 'Green', sex: 'male', colour: 'Cream', status: 'placed', birthWeight: 360, currentWeight: 14100, notes: 'Placed with Sebastian Engelbrecht' },
	{ id: 'puppy-004', litterId: 'litter-f1gd-001', collarColour: 'Yellow', sex: 'female', colour: 'Light Golden', status: 'placed', birthWeight: 310, currentWeight: 12800, notes: 'Placed with James Pretorius' },
	{ id: 'puppy-005', litterId: 'litter-f1gd-001', collarColour: 'Purple', sex: 'female', colour: 'Cream', status: 'placed', birthWeight: 330, currentWeight: 12300, notes: null },
	{ id: 'puppy-006', litterId: 'litter-f1gd-001', collarColour: 'Orange', sex: 'male', colour: 'Golden', status: 'placed', birthWeight: 370, currentWeight: 14500, notes: null },

	// litter-f1gd-002 (available, 7 pups – 3 reserved, 1 retained, 3 available)
	{ id: 'puppy-007', litterId: 'litter-f1gd-002', collarColour: 'Red', sex: 'female', colour: 'Apricot', status: 'reserved', birthWeight: 310, currentWeight: 5200, notes: 'Reserved by Sophia Nkosi' },
	{ id: 'puppy-008', litterId: 'litter-f1gd-002', collarColour: 'Blue', sex: 'male', colour: 'Cream', status: 'reserved', birthWeight: 350, currentWeight: 5800, notes: 'Reserved' },
	{ id: 'puppy-009', litterId: 'litter-f1gd-002', collarColour: 'Green', sex: 'female', colour: 'Golden', status: 'available', birthWeight: 325, currentWeight: 5400, notes: null },
	{ id: 'puppy-010', litterId: 'litter-f1gd-002', collarColour: 'Yellow', sex: 'male', colour: 'Apricot', status: 'available', birthWeight: 340, currentWeight: 5600, notes: null },
	{ id: 'puppy-011', litterId: 'litter-f1gd-002', collarColour: 'Purple', sex: 'female', colour: 'Cream', status: 'reserved', birthWeight: 300, currentWeight: 5100, notes: 'Reserved by Clara Bosman' },
	{ id: 'puppy-012', litterId: 'litter-f1gd-002', collarColour: 'Orange', sex: 'male', colour: 'Golden', status: 'retained', birthWeight: 365, currentWeight: 6000, notes: 'Retained for breeding evaluation' },
	{ id: 'puppy-013', litterId: 'litter-f1gd-002', collarColour: 'Pink', sex: 'female', colour: 'Light Golden', status: 'available', birthWeight: 315, currentWeight: 5300, notes: null },

	// litter-f1gd-003 (born, 5 pups – all available)
	{ id: 'puppy-014', litterId: 'litter-f1gd-003', collarColour: 'Red', sex: 'male', colour: 'Cream', status: 'available', birthWeight: 290, currentWeight: 850, notes: 'Largest of the litter' },
	{ id: 'puppy-015', litterId: 'litter-f1gd-003', collarColour: 'Blue', sex: 'male', colour: 'Apricot', status: 'available', birthWeight: 270, currentWeight: 780, notes: null },
	{ id: 'puppy-016', litterId: 'litter-f1gd-003', collarColour: 'Green', sex: 'male', colour: 'Golden', status: 'available', birthWeight: 280, currentWeight: 810, notes: null },
	{ id: 'puppy-017', litterId: 'litter-f1gd-003', collarColour: 'Yellow', sex: 'female', colour: 'Cream', status: 'available', birthWeight: 260, currentWeight: 740, notes: null },
	{ id: 'puppy-018', litterId: 'litter-f1gd-003', collarColour: 'Purple', sex: 'female', colour: 'Light Golden', status: 'available', birthWeight: 265, currentWeight: 760, notes: null },

	// litter-f1bgd-001 (weaning, 6 pups – 2 reserved, 4 available)
	{ id: 'puppy-019', litterId: 'litter-f1bgd-001', collarColour: 'Red', sex: 'female', colour: 'Cream', status: 'reserved', birthWeight: 280, currentWeight: 2200, notes: 'Reserved by Liam Botha' },
	{ id: 'puppy-020', litterId: 'litter-f1bgd-001', collarColour: 'Blue', sex: 'male', colour: 'Apricot', status: 'available', birthWeight: 300, currentWeight: 2500, notes: null },
	{ id: 'puppy-021', litterId: 'litter-f1bgd-001', collarColour: 'Green', sex: 'female', colour: 'Cream', status: 'available', birthWeight: 275, currentWeight: 2100, notes: null },
	{ id: 'puppy-022', litterId: 'litter-f1bgd-001', collarColour: 'Yellow', sex: 'male', colour: 'Cream', status: 'reserved', birthWeight: 295, currentWeight: 2400, notes: 'Reserved by Noah Fourie' },
	{ id: 'puppy-023', litterId: 'litter-f1bgd-001', collarColour: 'Purple', sex: 'female', colour: 'Apricot', status: 'available', birthWeight: 270, currentWeight: 2050, notes: null },
	{ id: 'puppy-024', litterId: 'litter-f1bgd-001', collarColour: 'Orange', sex: 'male', colour: 'Cream', status: 'available', birthWeight: 310, currentWeight: 2600, notes: null },

	// litter-f1gd-004 (completed, 5 pups – all placed)
	{ id: 'puppy-025', litterId: 'litter-f1gd-004', collarColour: 'Red', sex: 'male', colour: 'Golden', status: 'placed', birthWeight: 250, currentWeight: 8500, notes: null },
	{ id: 'puppy-026', litterId: 'litter-f1gd-004', collarColour: 'Blue', sex: 'female', colour: 'Cream', status: 'placed', birthWeight: 235, currentWeight: 7800, notes: null },
	{ id: 'puppy-027', litterId: 'litter-f1gd-004', collarColour: 'Green', sex: 'female', colour: 'Light Golden', status: 'placed', birthWeight: 240, currentWeight: 8100, notes: null },
	{ id: 'puppy-028', litterId: 'litter-f1gd-004', collarColour: 'Yellow', sex: 'male', colour: 'Cream', status: 'placed', birthWeight: 260, currentWeight: 8900, notes: null },
	{ id: 'puppy-029', litterId: 'litter-f1gd-004', collarColour: 'Purple', sex: 'female', colour: 'Golden', status: 'placed', birthWeight: 245, currentWeight: 8200, notes: null },

	// litter-bd-001 (born, 4 pups – 1 reserved, 3 available)
	{ id: 'puppy-030', litterId: 'litter-bd-001', collarColour: 'Red', sex: 'male', colour: 'Black & White', status: 'available', birthWeight: 220, currentWeight: 480, notes: null },
	{ id: 'puppy-031', litterId: 'litter-bd-001', collarColour: 'Blue', sex: 'female', colour: 'Blue Merle', status: 'reserved', birthWeight: 210, currentWeight: 460, notes: null },
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

// 30 clients across all lifecycle stages
// preferredBreedSize / secondChoiceBreedSize use the same key format as litter breed
const CLIENTS = [
	// ── Placed (4) — linked to completed litters ──────────────────────────────
	{
		id: 'client-001',
		firstName: 'Emma', lastName: 'van der Berg',
		email: 'emma.vanderberg@gmail.com', phone: '+27821234001', city: 'Cape Town', country: 'ZA',
		stage: 'placed', depositStatus: 'paid', priority: 5,
		puppyId: 'puppy-001', litterId: 'litter-f1gd-001',
		adminNotes: 'Wonderful family, very responsive. Collected their puppy in January 2025.',
		appOverrides: { livingType: 'house', hasChildren: true, childrenAges: [7, 11], readyTimeframe: 'asap', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-002',
		firstName: 'James', lastName: 'Pretorius',
		email: 'james.pretorius@outlook.com', phone: '+27831234002', city: 'Johannesburg', country: 'ZA',
		stage: 'placed', depositStatus: 'paid', priority: 8,
		puppyId: 'puppy-004', litterId: 'litter-f1gd-001',
		adminNotes: 'Single professional, works from home full time. Excellent match.',
		appOverrides: { hasChildren: false, childrenAges: [], someoneHomeDuringDay: true, livingType: 'apartment', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-023',
		firstName: 'Emily', lastName: 'Lourens',
		email: 'emily.lourens@icloud.com', phone: '+27851234023', city: 'Pretoria East', country: 'ZA',
		stage: 'placed', depositStatus: 'paid', priority: 6,
		puppyId: 'puppy-002', litterId: 'litter-f1gd-001',
		adminNotes: 'Placed puppy from Spring 2024 litter. Sent lovely photos at 6 months.',
		appOverrides: { readyTimeframe: 'asap', livingType: 'house', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-024',
		firstName: 'Sebastian', lastName: 'Engelbrecht',
		email: 'seb.engelbrecht@gmail.com', phone: '+27861234024', city: 'Hermanus', country: 'ZA',
		stage: 'placed', depositStatus: 'paid', priority: 7,
		puppyId: 'puppy-003', litterId: 'litter-f1gd-001',
		adminNotes: 'Placed from Spring 2024 litter. Active lifestyle, dog does agility now!',
		appOverrides: { activityLevel: 'Very active — hiking, running daily', livingType: 'house', preferredBreedSize: 'f1_goldendoodle - standard' },
	},

	// ── Match requested (1) — litter assigned, awaiting puppy selection ───────
	{
		id: 'client-032',
		firstName: 'Clara', lastName: 'Bosman',
		email: 'clara.bosman@gmail.com', phone: '+27731234032', city: 'Durbanville', country: 'ZA',
		stage: 'match_requested', depositStatus: 'paid', priority: 10,
		puppyId: null, litterId: 'litter-f1gd-002',
		adminNotes: 'Sent puppy selection link 25 March 2026. Awaiting choice from litter-f1gd-002.',
		appOverrides: { preferredSex: 'female', preferredColour: 'Cream', readyTimeframe: 'asap', preferredBreedSize: 'f1_goldendoodle - standard', considerOtherColour: false },
	},

	// ── Matched (2) — puppy selected ─────────────────────────────────────────
	{
		id: 'client-003',
		firstName: 'Sophia', lastName: 'Nkosi',
		email: 'sophia.nkosi@yahoo.com', phone: '+27711234003', city: 'Pretoria', country: 'ZA',
		stage: 'matched', depositStatus: 'paid', priority: 12,
		puppyId: 'puppy-007', litterId: 'litter-f1gd-002',
		adminNotes: 'Matched to litter-f1gd-002. Deposit paid. Going home mid-April.',
		appOverrides: { preferredSex: 'female', preferredColour: 'Apricot', readyTimeframe: 'asap', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
	{
		id: 'client-004',
		firstName: 'Liam', lastName: 'Botha',
		email: 'liam.botha@gmail.com', phone: '+27841234004', city: 'Stellenbosch', country: 'ZA',
		stage: 'matched', depositStatus: 'paid', priority: 15,
		puppyId: 'puppy-019', litterId: 'litter-f1bgd-001',
		adminNotes: 'Matched to litter-f1bgd-001. Wine farmer — large property.',
		appOverrides: { livingType: 'farm', yardSize: 'Large farm property', hasGarden: true, preferredBreedSize: 'f1b_goldendoodle - standard' },
	},

	// ── Waitlisted — with deposit (4) ────────────────────────────────────────
	{
		id: 'client-005',
		firstName: 'Olivia', lastName: 'Coetzee',
		email: 'olivia.coetzee@icloud.com', phone: '+27851234005', city: 'Durban', country: 'ZA',
		stage: 'waitlisted', depositStatus: 'paid', priority: 1,
		puppyId: null, litterId: null,
		adminNotes: 'Strong application, waiting on F1b litter. Very patient and communicative.',
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
		adminNotes: 'Added to F1b waitlist. Very thorough application. Deposit pending EFT.',
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
		adminNotes: 'Farm lifestyle, lots of space. Waiting on F1 litter.',
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

	// ── Approved (5) — reviewed, good fit, not yet waitlisted ─────────────────
	{
		id: 'client-011',
		firstName: 'Charlotte', lastName: 'Nel',
		email: 'charlotte.nel@outlook.com', phone: '+27831234011', city: 'Sandton', country: 'ZA',
		stage: 'approved', depositStatus: 'none', priority: 35,
		puppyId: null, litterId: null,
		adminNotes: 'Application reviewed. Good fit for F1 litter. Will contact when litter-f1gd-003 ready.',
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

	// ── Enquired (7) — new applications ───────────────────────────────────────
	{
		id: 'client-016',
		firstName: 'Elijah', lastName: 'van Rensburg',
		email: 'elijah.vanrensburg@gmail.com', phone: '+27871234016', city: 'Midrand', country: 'ZA',
		stage: 'enquired', depositStatus: 'none', priority: 50,
		puppyId: null, litterId: null,
		adminNotes: null,
		appOverrides: { readyTimeframe: '6_months', preferredBreedSize: 'f1_goldendoodle - standard' },
	},
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

	// ── Rejected (2) ──────────────────────────────────────────────────────────
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

// ─── Activity data ────────────────────────────────────────────────────────────
// Seed realistic timeline events for each client using client_activity table

function activityEventsForClient(client: typeof CLIENTS[0]) {
	const events: Array<{ type: string; description: string; actor: string; metadata: Record<string, unknown> }> = [];

	// All clients submitted an application
	events.push({
		type: 'application_submitted',
		description: 'Application submitted via online form.',
		actor: 'client',
		metadata: {},
	});

	// Stage progression events
	const stageOrder = ['enquired', 'approved', 'waitlisted', 'placed', 'match_requested', 'matched', 'matched_paid'];
	const currentIndex = stageOrder.indexOf(client.stage);

	if (currentIndex >= 1) {
		events.push({ type: 'stage_changed', description: 'Application reviewed and approved by admin.', actor: 'admin', metadata: { from: 'enquired', to: 'approved' } });
	}
	if (currentIndex >= 2) {
		events.push({ type: 'stage_changed', description: 'All required documents verified. Client moved to waitlist.', actor: 'system', metadata: { from: 'approved', to: 'waitlisted' } });
	}
	if (currentIndex >= 3) {
		events.push({ type: 'stage_changed', description: 'Client assigned to a litter by admin.', actor: 'admin', metadata: { from: 'waitlisted', to: 'placed', litterId: client.litterId } });
	}
	if (currentIndex >= 4) {
		events.push({ type: 'stage_changed', description: 'Puppy selection link sent to client.', actor: 'admin', metadata: { from: 'placed', to: 'match_requested' } });
	}
	if (currentIndex >= 5) {
		events.push({ type: 'stage_changed', description: 'Client selected a puppy.', actor: 'client', metadata: { from: 'match_requested', to: 'matched', puppyId: client.puppyId } });
	}

	// Rejected clients
	if (client.stage === 'rejected') {
		events.push({ type: 'stage_changed', description: 'Application rejected. Reason noted in admin notes.', actor: 'admin', metadata: { from: 'enquired', to: 'rejected' } });
	}

	// Deposit events for clients with a deposit
	if (client.depositStatus === 'pending') {
		events.push({ type: 'deposit_changed', description: 'Client expressed intent to pay deposit.', actor: 'client', metadata: { from: 'none', to: 'pending' } });
	}
	if (client.depositStatus === 'paid') {
		events.push({ type: 'deposit_changed', description: 'Client expressed intent to pay deposit.', actor: 'client', metadata: { from: 'none', to: 'pending' } });
		events.push({ type: 'deposit_changed', description: 'Deposit payment confirmed by admin.', actor: 'admin', metadata: { from: 'pending', to: 'paid' } });
	}

	// Admin notes event for clients with notes
	if (client.adminNotes) {
		events.push({ type: 'notes_updated', description: 'Admin notes updated.', actor: 'admin', metadata: {} });
	}

	return events;
}

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
			ON CONFLICT (id) DO UPDATE SET
				breed = EXCLUDED.breed,
				status = EXCLUDED.status,
				cover_image_url = EXCLUDED.cover_image_url,
				updated_at = NOW()
		`;
		console.log(`  ✓ ${litter.name} (${litter.breed})`);
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
			ON CONFLICT (id) DO UPDATE SET
				status = EXCLUDED.status,
				current_weight = EXCLUDED.current_weight,
				updated_at = NOW()
		`;
		console.log(`  ✓ ${puppy.collarColour} collar (${puppy.sex}) → ${puppy.litterId}`);
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
			ON CONFLICT (id) DO UPDATE SET
				stage = EXCLUDED.stage,
				deposit_status = EXCLUDED.deposit_status,
				puppy_id = EXCLUDED.puppy_id,
				litter_id = EXCLUDED.litter_id,
				application_data = EXCLUDED.application_data,
				admin_notes = EXCLUDED.admin_notes,
				updated_at = NOW()
		`;
		console.log(`  ✓ ${client.firstName} ${client.lastName} (${client.stage} / deposit: ${client.depositStatus})`);
	}

	// ── Step 9: Insert client activity events ─────────────────────────────────
	console.log('\n📋 Inserting client activity events...');
	let totalActivity = 0;

	for (const client of CLIENTS) {
		const events = activityEventsForClient(client);
		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			const eventId = `act-${client.id}-${i + 1}`;
			// Stagger created_at so timeline is in correct order (oldest first)
			const offsetMinutes = (events.length - i) * 1440; // 1 day apart, oldest first
			await db`
				INSERT INTO client_activity (
					id, client_id, type, description, metadata, actor,
					created_at
				) VALUES (
					${eventId}, ${client.id}, ${ev.type}, ${ev.description},
					${JSON.stringify(ev.metadata)}, ${ev.actor},
					NOW() - (${offsetMinutes} || ' minutes')::interval
				)
				ON CONFLICT (id) DO NOTHING
			`;
		}
		totalActivity += events.length;
		console.log(`  ✓ ${client.firstName} ${client.lastName}: ${events.length} events`);
	}

	// ── Done ───────────────────────────────────────────────────────────────────
	console.log('\n✅ Seed complete!');
	console.log(`   Dogs:            ${DOGS.length}`);
	console.log(`   Litters:         ${LITTERS.length}`);
	console.log(`   Puppies:         ${PUPPIES.length}`);
	console.log(`   Clients:         ${CLIENTS.length}`);
	console.log(`   Activity events: ${totalActivity}`);

	await db.end();
	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
