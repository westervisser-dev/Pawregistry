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

// Which tier the client selected at apply time: 'r5000' (Secured) | 'r500' (Standard) | null (Free)
export type DepositTier = 'r5000' | 'r500' | null;

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
	depositTier: DepositTier;    // 'r5000' | 'r500' | null — set at application, null for free list
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
	budget: 'r5k_r10k' | 'r10k_r20k' | 'r30k_r40k' | 'r40k_plus' | null;
}

// ─── Update (puppy journal posts) ────────────────────────────────────────────

export interface Update {
	id: string;
	title: string;
	body: string;
	mediaUrls: string[];
	litterId: string | null;
	isPublished: boolean;
	publishedAt: string | null;
	emailSentAt: string | null;
	weekNumber: number | null; // week of life (1, 2, 3…)
	createdAt: string;
	updatedAt: string;
}

export interface UpdateWithLitter extends Update {
	litter: { id: string; name: string } | null;
}

export interface LitterUpdateOptOut {
	id: string;
	clientId: string;
	litterId: string;
	createdAt: string;
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
// Breed data lives in breeds.ts — edit that file to configure per-breeder instance.

import type { BreedOption, SizeOption } from './breeds';
import { BREEDS, BREED_SIZES } from './breeds';
export type { BreedOption, SizeOption };
export { BREEDS, BREED_SIZES };

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
