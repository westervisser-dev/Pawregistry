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

export type LitterStatus = 'planned' | 'confirmed' | 'born' | 'weaning' | 'ready' | 'completed';

export interface Litter {
	id: string;
	name: string; // e.g. "Spring 2025 Litter"
	sireId: string;
	damId: string;
	status: LitterStatus;
	whelpDate: string | null;
	expectedDate: string | null;
	puppyCount: number | null;
	availableCount: number | null;
	depositAmount: number | null;
	purchasePrice: number | null;
	notes: string | null;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface LitterWithDogs extends Litter {
	sire: Dog;
	dam: Dog;
	puppies: Puppy[];
}

// ─── Puppy ───────────────────────────────────────────────────────────────────

export type PuppyStatus = 'available' | 'reserved' | 'placed' | 'retained' | 'not_for_sale';

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
	| 'enquiry'
	| 'reviewed'
	| 'waitlisted'
	| 'matched'
	| 'placed'
	| 'declined';

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
	puppyId: string | null;
	litterId: string | null;
	applicationData: ClientApplication;
	adminNotes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ClientApplication {
	livingType: 'house' | 'apartment' | 'farm' | 'other';
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

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageAuthor = 'admin' | 'client';

export interface Message {
	id: string;
	clientId: string;
	author: MessageAuthor;
	body: string;
	attachmentUrls: string[];
	readAt: string | null;
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
