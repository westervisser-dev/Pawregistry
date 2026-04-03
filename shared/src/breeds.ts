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
	{ value: 'f1_goldendoodle', label: 'F1 Goldendoodle', detail: 'Golden Retriever × Poodle' },
	{ value: 'f1b_goldendoodle', label: 'F1b Goldendoodle', detail: 'F1 Goldendoodle × Poodle' },
	{ value: 'f1_border_doodle', label: 'F1 Border Doodle', detail: 'Border Collie × Poodle' },
	{ value: 'f1_mini_biewer_doodle', label: 'F1 Mini Biewer Doodle', detail: 'Biewer Terrier × Mini Poodle' },
	{ value: 'red_tuxedo_french_poodle', label: 'Red Tuxedo French Poodle', detail: 'Pure bred poodle' },
];

export const BREED_SIZES: Record<string, SizeOption[]> = {
	f1_goldendoodle: [
		{ value: 'standard', label: 'Standard', detail: 'Golden Retriever × Standard Poodle · ±32–45 kg / 55–65 cm' },
		{ value: 'miniature', label: 'Miniature', detail: 'Golden Retriever × Miniature Poodle · ±25–28 kg / 45–50 cm' },
		{ value: 'dwarf', label: 'Dwarf', detail: 'Golden Retriever × Dwarf Poodle · ±16–24 kg / 40–45 cm' },
	],
	f1b_goldendoodle: [
		{ value: 'standard', label: 'Standard', detail: 'Golden Retriever × Standard Poodle · ±32–45 kg / 55–65 cm' },
		{ value: 'miniature', label: 'Miniature', detail: 'Golden Retriever × Miniature Poodle · ±25–28 kg / 45–50 cm' },
		{ value: 'dwarf', label: 'Dwarf', detail: 'Golden Retriever × Dwarf Poodle · ±16–24 kg / 40–45 cm' },
	],
	f1_border_doodle: [
		{ value: 'border_doodle', label: 'Border Doodle', detail: 'Border Collie × Miniature Poodle · ±13–18 kg / 30–38 cm' },
	],
	f1_mini_biewer_doodle: [
		{ value: 'biewer_doodle', label: 'Biewer Doodle', detail: 'Biewer Terrier × Miniature Poodle · ±7–12 kg / 20–25 cm' },
	],
	red_tuxedo_french_poodle: [
		{ value: 'standard_poodle', label: 'Standard Poodle', detail: 'Pure bred poodle · ±25–30 kg / 40–50 cm' },
		{ value: 'moyen_poodle', label: 'Moyen Poodle', detail: 'Pure bred poodle of medium size · ±12–18 kg / 30–38 cm' },
	],
};
