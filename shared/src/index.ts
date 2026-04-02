// ─── Dog ────────────────────────────────────────────────────────────────────

export type DogSex = 'male' | 'female';
export type DogStatus = 'active' | 'retired' | 'deceased';

export interface Dog {
	id: string;
	name: string;
	callName: string | null;
	registeredName: string | null;
	breed: string;
	sex: DogSex;
	dob: string; // ISO date string
	colour: string;
	status: DogStatus;
	sireId: string | null;
	damId: string | null;
	microchipNumber: string | null;
	registrationNumber: string | null;
	profileImageUrl: string | null;
	imageUrls: string[];
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DogWithPedigree extends Dog {
	sire: Dog | null;
	dam: Dog | null;
}

// ─── Health Certificate ──────────────────────────────────────────────────────

export type HealthCertType =
	| 'ofa_hips'
	| 'ofa_elbows'
	| 'ofa_eyes'
	| 'ofa_heart'
	| 'dna_panel'
	| 'brucellosis'
	| 'other';

export type HealthCertResult = 'pass' | 'fail' | 'pending' | 'excellent' | 'good' | 'fair';

export interface HealthCert {
	id: string;
	dogId: string;
	type: HealthCertType;
	result: HealthCertResult;
	certNumber: string | null;
	issuedBy: string | null;
	issuedAt: string;
	expiresAt: string | null;
	documentUrl: string | null;
	notes: string | null;
	createdAt: string;
}

// ─── Litter ──────────────────────────────────────────────────────────────────

export type LitterStatus = 'planned' | 'confirmed' | 'born' | 'weaning' | 'available' | 'completed';

export interface Litter {
	id: string;
	name: string; // e.g. "Spring 2025 Litter"
	breed: string | null;
	sireId: string;
	damId: string;
	status: LitterStatus;
	whelpDate: string | null;
	expectedDate: string | null;
	puppyCount: number | null;
	availableCount: number | null;
	depositAmount: number | null;
	notes: string | null;
	coverImageUrl: string | null;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface LitterImage {
	id: string;
	litterId: string;
	url: string;
	storagePath: string;
	sortOrder: number;
	createdAt: string;
}

export interface LitterWithDogs extends Litter {
	sire: Dog;
	dam: Dog;
	puppies: Puppy[];
	images: LitterImage[];
}

// ─── Puppy ───────────────────────────────────────────────────────────────────

export type PuppyStatus = 'available' | 'reserved' | 'matched' | 'matched_paid' | 'retained' | 'not_for_sale';

export interface Puppy {
	id: string;
	litterId: string;
	dogId: string | null; // set once graduated to a full Dog record
	collarColour: string;
	sex: DogSex;
	colour: string;
	status: PuppyStatus;
	birthWeight: number | null; // grams
	currentWeight: number | null; // grams
	notes: string | null;
	profileImageUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export type ClientStage =
	| 'enquired'        // Client completed onboarding flow
	| 'approved'        // Admin reviewed and approved
	| 'rejected'        // Admin reviewed and rejected
	| 'waitlisted'      // Client completed all required docs
	| 'match_requested' // Client expressed interest in a puppy — awaiting admin approval
	| 'matched'         // Admin approved the puppy interest
	| 'matched_paid';   // Client paid in full

// DB values: 'none' | 'pending' (Deposit — Selected) | 'paid' (Deposit — Paid)
export type DepositStatus = 'none' | 'pending' | 'paid';

export interface Client {
	id: string;
	userId: string | null; // Supabase auth user id once account created
	firstName: string;
	lastName: string;
	email: string;
	phone: string | null;
	city: string | null;
	country: string;
	stage: ClientStage;
	priority: number; // lower = higher priority on waitlist
	depositStatus: DepositStatus; // 'none' | 'pending' (expressed intent) | 'paid' (confirmed by admin)
	puppyId: string | null;
	litterId: string | null;
	applicationData: ClientApplication;
	adminNotes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ClientApplication {
	// ── Existing ──
	livingType: 'house' | 'townhouse' | 'apartment' | 'farm' | 'other';
	otherLivingType: string | null;
	hasGarden: boolean;
	hasChildren: boolean;
	childrenAges: number[];
	hasOtherPets: boolean;
	otherPetsDescription: string | null;
	previousDogExperience: boolean;
	experienceDescription: string | null;
	preferredSex: DogSex | 'no_preference';
	preferredColour: string | null;
	reasonForBreed: string;
	references: string | null;
	agreedToContract: boolean;
	// ── Personal ──
	puppyPurpose: string | null;
	residenceOwnership: 'own' | 'rent' | 'lease' | null;
	primaryCaregiver: string | null;
	allergiesToDogs: boolean;
	allFamilyMembersAgree: boolean;
	dogLivesIndoors: boolean;
	// ── Home ──
	yardSize: string | null;
	hasPoolOrDriveway: boolean;
	poolDrivewayFenced: boolean;
	puppyDaytimeLocation: string | null;
	hoursAlonePerDay: string | null;
	someoneHomeDuringDay: boolean;
	aloneArrangements: string | null;
	neighbourhoodRestrictions: boolean;
	neighbourhoodRestrictionsDetails: string | null;
	childrenGenderAges: string | null;
	// ── Experience ──
	breedsOwnedPast: string | null;
	returnedPetToBreeder: boolean;
	returnedPetDetails: string | null;
	givenPetAway: boolean;
	givenPetAwayDetails: string | null;
	activityLevel: string | null;
	willingForObedienceClasses: boolean;
	// ── Preferences ──
	readyTimeframe: 'asap' | '6_months' | '1_year' | null;
	preferredBreedSize: string | null;
	secondChoiceBreedSize: string | null;
	considerOppositeSex: boolean;
	considerOtherColour: boolean;
	considerOtherBreedSize: boolean;
	considerRehome: boolean;
}

// ─── Update (puppy journal posts) ────────────────────────────────────────────

export type UpdateTargetType = 'litter' | 'puppy' | 'client';

export interface Update {
	id: string;
	title: string;
	body: string;
	mediaUrls: string[];
	targetType: UpdateTargetType;
	targetId: string;
	publishedAt: string | null;
	isPublished: boolean;
	weekNumber: number | null; // week of life (1, 2, 3…)
	createdAt: string;
	updatedAt: string;
}

// ─── Document ────────────────────────────────────────────────────────────────

export type DocumentType = 'contract' | 'health_record' | 'go_home_pack' | 'invoice' | 'other';

export interface Document {
	id: string;
	clientId: string;
	puppyId: string | null;
	type: DocumentType;
	label: string;
	fileUrl: string;
	signedAt: string | null;
	createdAt: string;
}

// ─── Go-Home Checklist ───────────────────────────────────────────────────────

export interface GoHomeChecklist {
	id: string;
	clientId: string;
	puppyId: string;
	vetCheckDone: boolean;
	microchipRegistered: boolean;
	contractSigned: boolean;
	depositPaid: boolean;
	balancePaid: boolean;
	puppyPackPrepared: boolean;
	goHomeDate: string | null;
	notes: string | null;
	updatedAt: string;
}

// ─── Document Template ────────────────────────────────────────────────────────

export interface DocumentTemplate {
	id: string;
	name: string;
	description: string | null;
	fileUrl: string;
	category: string | null;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DocumentTemplateWithChecklist extends DocumentTemplate {
	checkedAt: string | null;
	uploadedFileUrl: string | null;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface Admin {
	id: string;
	userId: string;
	email: string;
	createdAt: string;
}

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
	id: string;
	trigger: string;
	subject: string;
	body: string;
	enabled: boolean;
	updatedAt: string;
}

export interface EmailLog {
	id: string;
	clientId: string;
	trigger: string;
	subject: string;
	resendId: string | null;
	sentAt: string;
	metadata: Record<string, unknown>;
}

// ─── Client Activity ─────────────────────────────────────────────────────────

export type ClientActivityType =
	| 'application_submitted'
	| 'stage_changed'
	| 'deposit_changed'
	| 'preferences_updated'
	| 'notes_updated'
	| 'document_uploaded'
	| 'document_signed';

export type ClientActivityActor = 'client' | 'admin' | 'system';

export interface ClientActivity {
	id: string;
	clientId: string;
	type: ClientActivityType;
	description: string;
	metadata: Record<string, unknown>;
	actor: ClientActivityActor;
	createdAt: string;
}

// ─── Puppy Interest ───────────────────────────────────────────────────────────

export type PuppyInterestStatus = 'pending' | 'approved' | 'rejected';

export interface PuppyInterest {
	id: string;
	puppyId: string;
	clientId: string;
	status: PuppyInterestStatus;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PuppyInterestWithClient extends PuppyInterest {
	client: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		city: string | null;
		stage: ClientStage;
		depositStatus: DepositStatus;
	};
}

// ─── Litter Notification ──────────────────────────────────────────────────────

export interface LitterNotification {
	id: string;
	litterId: string;
	clientId: string;
	notifiedAt: string;
	createdAt: string;
}

// ─── Litter Interest ──────────────────────────────────────────────────────────

export interface LitterInterest {
	id: string;
	clientId: string;
	litterId: string;
	createdAt: string;
	updatedAt: string;
}

export interface LitterInterestWithClient extends LitterInterest {
	client: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		city: string | null;
		depositStatus: DepositStatus;
		priority: number;
	};
}

// ─── Breed & Size Constants ──────────────────────────────────────────────────

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

/** Parse a combined "breed - size" key into its parts */
export function parseBreedSize(raw: string | null | undefined): { breed: string; size: string | null } | null {
	if (!raw) return null;
	const parts = raw.split(' - ');
	return { breed: parts[0], size: parts[1] ?? null };
}

/** Build a combined "breed - size" key */
export function buildBreedSize(breed: string, size?: string | null): string {
	return size ? `${breed} - ${size}` : breed;
}

/** Get human-readable label for a breed-size key */
export function getBreedSizeLabel(raw: string | null | undefined): string {
	const parsed = parseBreedSize(raw);
	if (!parsed) return '—';
	const breedLabel = BREEDS.find((b) => b.value === parsed.breed)?.label ?? parsed.breed;
	if (!parsed.size) return breedLabel;
	const sizeLabel = BREED_SIZES[parsed.breed]?.find((s) => s.value === parsed.size)?.label ?? parsed.size;
	return `${breedLabel} · ${sizeLabel}`;
}

// ─── Client-Litter Matching ──────────────────────────────────────────────────

export interface MatchingClient {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	city: string | null;
	stage: ClientStage;
	depositStatus: DepositStatus;
	priority: number;
	waitlistPosition: number | null;
	preferredBreedSize: string | null;
	secondChoiceBreedSize: string | null;
	preferredSex: string | null;
	preferredColour: string | null;
	considerOppositeSex: boolean;
	considerOtherColour: boolean;
	considerOtherBreedSize: boolean;
	considerRehome: boolean;
	score: number;
	matchReasons: string[];
}

// ─── Client-facing litter match ──────────────────────────────────────────────

export type LitterMatchTier = 'great' | 'good' | 'partial' | 'low';

export interface LitterMatchResult {
	litterId: string;
	tier: LitterMatchTier;
	matchReasons: string[];
}

// ─── API response helpers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
}

export interface ApiError {
	error: string;
	message: string;
}
