// ─── Sex type (shared by puppies and client preferences) ────────────────────

export type DogSex = 'male' | 'female';

// ─── Litter ──────────────────────────────────────────────────────────────────

export type LitterStatus = 'planned' | 'available' | 'booked' | 'completed';

export interface Litter {
	id: string;
	name: string; // e.g. "Spring 2025 Litter"
	breed: string | null;
	status: LitterStatus;
	selectionDate: string; // when clients can pick a puppy
	goHomeDate: string | null; // when puppies go to their new home
	puppyCount: number | null;
	availableCount: number | null;
	depositAmount: number | null;
	shippingRands: number | null;
	dateOfBirth: string | null;
	estimatedAdultWeightMinKg: number | null;
	estimatedAdultWeightMaxKg: number | null;
	estimatedAdultHeightMinCm: number | null;
	estimatedAdultHeightMaxCm: number | null;
	notes: string | null;
	coverImageUrl: string | null;
	isPublic: boolean;
	launchedAt: string | null; // first time a notification was sent for this litter — opens it for reservations
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

export interface PuppyImage {
	id: string;
	puppyId: string;
	url: string;
	storagePath: string;
	sortOrder: number;
	createdAt: string;
}

export interface PuppyWithImages extends Puppy {
	images: PuppyImage[];
}

export interface LitterWithDogs extends Litter {
	puppies: PuppyWithImages[];
	images: LitterImage[];
}

// ─── Puppy ───────────────────────────────────────────────────────────────────

export type PuppyStatus = 'available' | 'reserved' | 'booked' | 'puppy_fully_paid' | 'retained' | 'not_for_sale';

export interface Puppy {
	id: string;
	litterId: string;
	collarColour: string;
	sex: DogSex;
	colour: string;
	status: PuppyStatus;
	birthWeight: number | null; // grams
	currentWeight: number | null; // grams
	priceRands: number | null;
	notes: string | null;
	profileImageUrl: string | null;
	bookingExpiresAt: string | null;
	createdAt: string;
	updatedAt: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export type ClientStage =
	| 'enquired'          // Client completed onboarding flow
	| 'approved'          // Admin reviewed and approved
	| 'rejected'          // Admin reviewed and rejected
	| 'waitlisted'        // Client completed all required docs
	| 'puppy_reserved'    // R500/no-deposit client reserved a puppy (awaiting booking payment)
	| 'puppy_booked'      // R5000 client reserved, or R500/no-deposit client paid booking deposit
	| 'puppy_fully_paid'; // Client paid in full

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
	depositStatus: DepositStatus; // 'none' | 'paid' — set automatically on payment confirmation
	depositTier: DepositTier;    // 'r5000' | 'r500' | null — set at application, null for free list
	depositChosenAt: string | null; // when the deposit tier was selected (or last changed)
	puppyId: string | null;
	litterId: string | null;
	applicationData: ClientApplication;
	adminNotes: string | null;
	reservedAt: string | null;
	matchedAt: string | null;
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
	targetedClientIds: string[] | null;
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

export interface AppSetting {
	key: string;
	value: string;
	updatedAt: string;
}

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
	| 'document_signed'
	| 'deposit_paid'
	| 'booking_payment_received'
	| 'booking_expired'
	| 'final_payment_received'
	| 'instalment_payment_received'
	| 'payment_marked_paid';

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

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentType = 'deposit' | 'booking' | 'final';
export type PaymentStatus = 'pending' | 'complete' | 'failed' | 'cancelled';

export interface Payment {
	id: string;
	clientId: string;
	type: PaymentType;
	amountRands: number;
	reference: string;
	paystackId: string | null;
	authorizationUrl: string | null;
	status: PaymentStatus;
	expiresAt: string | null;
	dueDate: string | null;
	paidAt: string | null;
	metadata: Record<string, unknown>;
	createdAt: string;
}

export interface PaymentWithClient extends Payment {
	client: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
	};
}

export interface PaymentSummary {
	clientId: string;
	totalPriceRands: number | null;
	isTotalEstimated: boolean;
	alreadyPaid: number;
	depositPaid: number;
	balanceDue: number | null;
	pendingCount: number;
	overdueCount: number;
	nextDueDate: string | null;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'cancelled';

export interface InvoiceLineItem {
	description: string;
	quantity: number;
	unitPriceRands: number;
	totalRands: number;
}

export interface Invoice {
	id: string;
	invoiceNumber: string;
	clientId: string;
	puppyId: string | null;
	status: InvoiceStatus;
	lineItems: InvoiceLineItem[];
	subtotalRands: number;
	totalRands: number;
	paidRands: number;
	breederName: string;
	breederEmail: string;
	clientName: string;
	clientEmail: string;
	clientPhone: string | null;
	clientCity: string | null;
	viewToken: string;
	notes: string | null;
	issuedAt: string | null;
	dueDate: string | null;
	sentAt: string | null;
	viewedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface InvoiceWithPayments extends Invoice {
	payments: Payment[];
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
