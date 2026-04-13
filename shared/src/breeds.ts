// ─── Breed & Size Config ─────────────────────────────────────────────────────
// Edit this file to configure breeds for each breeder instance.
// Each entry needs a unique `value` (used as DB key) and a human-readable `label`.

export interface BreedOption {
	value: string;
	label: string;
	detail: string;
}

export interface SizeOption {
	value: string;
	label: string;
	detail: string;
}

export const BREEDS: BreedOption[] = [
	{ value: 'aussie_doodle', label: 'Aussie Doodle', detail: 'Australian Shepherd × Poodle' },
	{ value: 'cavalier_king_charles_spaniel', label: 'Cavalier King Charles Spaniel', detail: 'Pure breed' },
	{ value: 'cavapoo', label: 'Cavapoo', detail: 'Cavalier King Charles Spaniel × Poodle' },
	{ value: 'cockapoo', label: 'Cockapoo', detail: 'Cocker Spaniel × Poodle' },
	{ value: 'english_cocker_spaniel', label: 'English Cocker Spaniel', detail: 'Pure breed' },
	{ value: 'golden_doodle', label: 'Golden Doodle', detail: 'Golden Retriever × Poodle' },
	{ value: 'pomapoo', label: 'Pomapoo', detail: 'Pomeranian × Poodle' },
	{ value: 'poodle', label: 'Poodle', detail: 'Pure breed' },
	{ value: 'shih_tzu', label: 'Shih Tzu', detail: 'Pure breed' },
	{ value: 'toy_poodle', label: 'Toy Poodle', detail: 'Pure breed · miniature variety' },
];

export const BREED_SIZES: Record<string, SizeOption[]> = {
	aussie_doodle: [
		{ value: 'standard', label: 'Standard', detail: 'Australian Shepherd × Standard Poodle · ±18–30 kg / 43–58 cm' },
		{ value: 'mini', label: 'Mini', detail: 'Australian Shepherd × Mini Poodle · ±7–14 kg / 33–46 cm' },
	],
	cavalier_king_charles_spaniel: [
		{ value: 'standard', label: 'Standard', detail: 'Pure breed · ±5–8 kg / 30–33 cm' },
	],
	cavapoo: [
		{ value: 'standard', label: 'Standard', detail: 'Cavalier × Standard Poodle · ±8–12 kg / 30–40 cm' },
		{ value: 'mini', label: 'Mini', detail: 'Cavalier × Mini Poodle · ±4–8 kg / 25–35 cm' },
	],
	cockapoo: [
		{ value: 'standard', label: 'Standard', detail: 'Cocker Spaniel × Standard Poodle · ±9–11 kg / 38–46 cm' },
		{ value: 'mini', label: 'Mini', detail: 'Cocker Spaniel × Mini Poodle · ±5–9 kg / 25–38 cm' },
	],
	english_cocker_spaniel: [
		{ value: 'standard', label: 'Standard', detail: 'Pure breed · ±12–15 kg / 38–43 cm' },
	],
	golden_doodle: [
		{ value: 'standard', label: 'Standard', detail: 'Golden Retriever × Standard Poodle · ±23–34 kg / 53–63 cm' },
		{ value: 'mini', label: 'Mini', detail: 'Golden Retriever × Mini Poodle · ±7–20 kg / 35–50 cm' },
	],
	pomapoo: [
		{ value: 'standard', label: 'Standard', detail: 'Pomeranian × Standard Poodle · ±7–14 kg / 25–40 cm' },
		{ value: 'mini', label: 'Mini', detail: 'Pomeranian × Mini Poodle · ±2–5 kg / 20–28 cm' },
	],
	poodle: [
		{ value: 'standard', label: 'Standard', detail: 'Pure breed · ±20–32 kg / 45–60 cm' },
		{ value: 'mini', label: 'Mini', detail: 'Pure breed · ±5–9 kg / 28–35 cm' },
	],
	shih_tzu: [
		{ value: 'standard', label: 'Standard', detail: 'Pure breed · ±4–7 kg / 20–28 cm' },
	],
	toy_poodle: [
		{ value: 'mini', label: 'Mini', detail: 'Pure breed · ±2–4 kg / under 28 cm' },
	],
};
