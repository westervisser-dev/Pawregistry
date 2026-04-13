import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

type Step = 'personal' | 'home' | 'experience' | 'preferences' | 'deposit' | 'confirm' | 'done';

interface FormData {
	// Personal
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	city: string;
	country: string;
	primaryCaregiver: string;
	// Home & Life
	residenceOwnership: 'own' | 'rent' | 'lease' | '';
	livingType: 'house' | 'townhouse' | 'apartment' | 'farm' | 'other';
	otherLivingType: string;
	hasGarden: boolean;
	yardSize: string;
	hasPoolOrDriveway: boolean;
	poolDrivewayFenced: boolean;
	neighbourhoodRestrictions: boolean;
	neighbourhoodRestrictionsDetails: string;
	dogLivesIndoors: boolean;
	puppyDaytimeLocation: string;
	hoursAlonePerDay: string;
	someoneHomeDuringDay: boolean;
	aloneArrangements: string;
	activityLevel: string;
	allFamilyMembersAgree: boolean;
	allergiesToDogs: boolean;
	hasChildren: boolean;
	childrenGenderAges: string;
	hasOtherPets: boolean;
	otherPetsDescription: string;
	// Experience
	previousDogExperience: boolean;
	breedsOwnedPast: string;
	experienceDescription: string;
	returnedPetToBreeder: boolean;
	returnedPetDetails: string;
	givenPetAway: boolean;
	givenPetAwayDetails: string;
	willingForObedienceClasses: boolean;
	references: string;
	// Preferences
	puppyPurpose: string;
	readyTimeframe: 'asap' | '6_months' | '1_year' | '';
	preferredBreed: string;
	preferredSize: string;
	hasSecondChoiceBreed: boolean;
	secondChoiceBreed: string;
	secondChoiceSize: string;
	hasSecondChoiceSize: boolean;
	considerOtherBreedSize: boolean;
	preferredSex: 'male' | 'female' | 'no_preference';
	considerOppositeSex: boolean;
	preferredColour: string;
	considerOtherColour: boolean;
	considerRehome: boolean;
	agreedToContract: boolean;
	puppyEnergyPreference: 'calm' | 'moderate' | 'active' | '';
	// Deposit
	depositTier: 'r5000' | 'r500' | '';
	petInsurance: boolean;
	wantsSettlingGuidance: boolean;
	// Budget
	budget: 'r5k_r10k' | 'r10k_r20k' | 'r30k_r40k' | 'r40k_plus' | '';
}

const initial: FormData = {
	firstName: '', lastName: '', email: '', phone: '', city: '', country: 'ZA',
	primaryCaregiver: '',
	residenceOwnership: '',
	livingType: 'house', otherLivingType: '',
	hasGarden: false, yardSize: '',
	hasPoolOrDriveway: false, poolDrivewayFenced: false,
	neighbourhoodRestrictions: false, neighbourhoodRestrictionsDetails: '',
	dogLivesIndoors: true,
	puppyDaytimeLocation: '', hoursAlonePerDay: '',
	someoneHomeDuringDay: false, aloneArrangements: '',
	activityLevel: '',
	allFamilyMembersAgree: true, allergiesToDogs: false,
	hasChildren: false, childrenGenderAges: '',
	hasOtherPets: false, otherPetsDescription: '',
	previousDogExperience: false, breedsOwnedPast: '', experienceDescription: '',
	returnedPetToBreeder: false, returnedPetDetails: '',
	givenPetAway: false, givenPetAwayDetails: '',
	willingForObedienceClasses: false,
	references: '',
	puppyPurpose: '',
	readyTimeframe: '', preferredBreed: '', preferredSize: '',
	hasSecondChoiceBreed: false, secondChoiceBreed: '', secondChoiceSize: '',
	hasSecondChoiceSize: false,
	considerOtherBreedSize: false,
	preferredSex: 'no_preference', considerOppositeSex: false,
	preferredColour: '', considerOtherColour: false,
	considerRehome: false,
	agreedToContract: false,
	puppyEnergyPreference: '',
	depositTier: '',
	petInsurance: false,
	wantsSettlingGuidance: false,
	budget: '',
};

const steps: Step[] = ['personal', 'home', 'experience', 'preferences', 'deposit', 'confirm', 'done'];

// Breed & size constants imported from shared
import { BREEDS, BREED_SIZES } from '@paw-registry/shared';

function StepIndicator({ current }: { current: Step }) {
	const labels = ['Personal', 'Home & Life', 'Experience', 'Preferences', 'Deposit'];
	const currentIdx = steps.indexOf(current);
	return (
		<div className="flex mb-10">
			{labels.map((label, i) => (
				<div key={label} className="flex items-start flex-1 sm:flex-none">
					<div className="flex flex-col items-center min-w-0">
						<div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium transition-colors ${
							i < currentIdx ? 'bg-brand-500 text-white' :
							i === currentIdx ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
							'bg-warm-100 text-warm-400'
						}`}>
							{i < currentIdx ? '✓' : i + 1}
						</div>
						<span className={`text-[10px] mt-1.5 text-center leading-tight hidden sm:block ${i === currentIdx ? 'text-brand-600 font-medium' : 'text-warm-400'}`}>
							{label}
						</span>
						<span className={`text-[10px] mt-1.5 text-center leading-tight sm:hidden ${i === currentIdx ? 'text-brand-600 font-medium' : ''}`}>
							{i === currentIdx ? label : ''}
						</span>
					</div>
					{i < labels.length - 1 && (
						<div className={`h-px flex-1 sm:w-16 sm:flex-none mx-1.5 mt-4 ${i < currentIdx ? 'bg-brand-300' : 'bg-warm-200'}`} />
					)}
				</div>
			))}
		</div>
	);
}

function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<div>
			<label className="block text-sm font-medium text-warm-700 mb-1">
				{label}{required && <span className="text-red-500 ml-0.5">*</span>}
			</label>
			<input
				{...props}
				className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
			/>
		</div>
	);
}

function Textarea({ label, required, ...props }: { label: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<div>
			<label className="block text-sm font-medium text-warm-700 mb-1">
				{label}{required && <span className="text-red-500 ml-0.5">*</span>}
			</label>
			<textarea
				{...props}
				rows={3}
				className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 resize-none"
			/>
		</div>
	);
}

function Toggle({ label, checked, onChange, required }: { label: string; checked: boolean; onChange: (v: boolean) => void; required?: boolean }) {
	return (
		<label className="flex items-center gap-3 cursor-pointer">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="sr-only peer"
			/>
			<div
				aria-hidden="true"
				className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors flex items-center peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-1 ${checked ? 'bg-brand-500' : 'bg-warm-200'}`}
			>
				<div className={`w-4 h-4 rounded-full bg-white shadow-sm mx-1 transition-transform ${checked ? 'translate-x-4' : ''}`} />
			</div>
			<span className="text-sm text-warm-700 leading-snug">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
		</label>
	);
}

function ButtonGroup<T extends string>({
	label,
	options,
	value,
	onChange,
	cols = 2,
	required,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T | '';
	onChange: (v: T) => void;
	cols?: number;
	required?: boolean;
}) {
	// On mobile always use 2 cols max; on sm+ use the specified cols
	const gridClass = cols === 3
		? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
		: 'grid grid-cols-2 gap-2';
	return (
		<div>
			<label className="block text-sm font-medium text-warm-700 mb-2">
				{label}{required && <span className="text-red-500 ml-0.5">*</span>}
			</label>
			<div className={gridClass}>
				{options.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => onChange(opt.value)}
						className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
							value === opt.value
								? 'bg-brand-50 border-brand-400 text-brand-700'
								: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
						}`}
					>
						{opt.label}
					</button>
				))}
			</div>
		</div>
	);
}

export function ApplyPage() {
	const [step, setStep] = useState<Step>('personal');
	const [form, setForm] = useState<FormData>(initial);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const set = (key: keyof FormData, value: FormData[keyof FormData]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const validateStep = (s: Step, f: FormData): string | null => {
		if (s === 'personal') {
			if (!f.firstName.trim() || !f.lastName.trim() || !f.email.trim() || !f.phone.trim() || !f.city.trim())
				return 'Please fill in all required fields before continuing.';
		}
		if (s === 'deposit') {
			if (!f.depositTier) return 'Please select which waiting list you would like to join.';
		}
		if (s === 'preferences') {
			const sizes = BREED_SIZES[f.preferredBreed] ?? [];
			if (
				!f.puppyPurpose.trim() ||
				!f.readyTimeframe ||
				!f.preferredBreed ||
				(sizes.length > 1 && !f.preferredSize) ||
				!f.preferredColour.trim() ||
				!f.agreedToContract
			) return 'Please fill in all required fields before continuing.';
		}
		return null;
	};

	const next = () => {
		const err = validateStep(step, form);
		if (err) { setError(err); return; }
		setError('');
		setStep(steps[steps.indexOf(step) + 1] as Step);
	};
	const back = () => { setError(''); setStep(steps[steps.indexOf(step) - 1] as Step); };

	const handleBreedChange = (breed: string) => {
		const sizes = BREED_SIZES[breed] ?? [];
		const autoSize = sizes.length === 1 ? sizes[0].value : '';
		setForm((f) => ({ ...f, preferredBreed: breed, preferredSize: autoSize }));
	};

	const handleSecondBreedChange = (breed: string) => {
		const sizes = BREED_SIZES[breed] ?? [];
		const autoSize = sizes.length === 1 ? sizes[0].value : '';
		setForm((f) => ({ ...f, secondChoiceBreed: breed, secondChoiceSize: autoSize }));
	};

	const submit = async () => {
		for (const s of steps.filter(s => s !== 'done')) {
			const err = validateStep(s, form);
			if (err) {
				setError('Please fill in all required fields before submitting.');
				setStep(s);
				return;
			}
		}
		setSubmitting(true);
		const preferredBreedSize = form.preferredSize
			? `${form.preferredBreed} - ${form.preferredSize}`
			: form.preferredBreed;
		let secondChoiceBreedSize: string | null = null;
		if (form.hasSecondChoiceBreed && form.secondChoiceBreed) {
			secondChoiceBreedSize = form.secondChoiceSize
				? `${form.secondChoiceBreed} - ${form.secondChoiceSize}`
				: form.secondChoiceBreed;
		} else if (!form.hasSecondChoiceBreed && form.hasSecondChoiceSize && form.secondChoiceSize) {
			secondChoiceBreedSize = `${form.preferredBreed} - ${form.secondChoiceSize}`;
		}
		try {
		const { data: applyData, error: apiError } = await api.clients.apply.post({
			firstName: form.firstName,
			lastName: form.lastName,
			email: form.email,
			phone: form.phone || undefined,
			city: form.city || undefined,
			country: form.country,
			depositTier: form.depositTier as 'r5000' | 'r500',
			applicationData: {
				// Existing
				livingType: form.livingType,
				otherLivingType: form.otherLivingType || null,
				hasGarden: form.hasGarden,
				hasChildren: form.hasChildren,
				childrenAges: [],
				childrenGenderAges: form.childrenGenderAges || null,
				hasOtherPets: form.hasOtherPets,
				otherPetsDescription: form.otherPetsDescription || null,
				previousDogExperience: form.previousDogExperience,
				experienceDescription: form.experienceDescription || null,
				preferredSex: form.preferredSex,
				preferredColour: form.preferredColour || null,
				reasonForBreed: null,
				references: form.references || null,
				agreedToContract: form.agreedToContract,
				// Personal
				puppyPurpose: form.puppyPurpose || null,
				residenceOwnership: form.residenceOwnership || null,
				primaryCaregiver: form.primaryCaregiver || null,
				allergiesToDogs: form.allergiesToDogs,
				allFamilyMembersAgree: form.allFamilyMembersAgree,
				dogLivesIndoors: form.dogLivesIndoors,
				// Home
				yardSize: form.yardSize || null,
				hasPoolOrDriveway: form.hasPoolOrDriveway,
				poolDrivewayFenced: form.poolDrivewayFenced,
				puppyDaytimeLocation: form.puppyDaytimeLocation || null,
				hoursAlonePerDay: form.hoursAlonePerDay || null,
				someoneHomeDuringDay: form.someoneHomeDuringDay,
				aloneArrangements: form.aloneArrangements || null,
				neighbourhoodRestrictions: form.neighbourhoodRestrictions,
				neighbourhoodRestrictionsDetails: form.neighbourhoodRestrictionsDetails || null,
				// Experience
				breedsOwnedPast: form.breedsOwnedPast || null,
				returnedPetToBreeder: form.returnedPetToBreeder,
				returnedPetDetails: form.returnedPetDetails || null,
				givenPetAway: form.givenPetAway,
				givenPetAwayDetails: form.givenPetAwayDetails || null,
				activityLevel: form.activityLevel || null,
				willingForObedienceClasses: form.willingForObedienceClasses,
				// Preferences
				readyTimeframe: form.readyTimeframe || null,
				preferredBreedSize: preferredBreedSize || null,
				secondChoiceBreedSize: secondChoiceBreedSize,
				considerOppositeSex: form.considerOppositeSex,
				considerOtherColour: form.considerOtherColour,
				considerOtherBreedSize: form.considerOtherBreedSize,
				considerRehome: form.considerRehome,
				puppyEnergyPreference: form.puppyEnergyPreference || null,
				budget: form.budget || null,
				petInsurance: form.petInsurance,
				wantsSettlingGuidance: form.wantsSettlingGuidance,
			},
		});
		setSubmitting(false);
		if (apiError) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const msg = (apiError as any)?.value?.message;
			setError(msg ?? 'Submission failed. Please try again.');
			// Jump back to personal step so they can see the email field
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((apiError as any)?.value?.error === 'EmailExists') setStep('personal');
			return;
		}
		// Redirect to Paystack checkout — always required, no free tier
		if (applyData?.authorizationUrl) {
			window.location.href = applyData.authorizationUrl as string;
		} else {
			setError('Could not start payment. Please try again.');
		}
	} catch {
		setSubmitting(false);
		setError('Submission failed. Please try again.');
	}
	};

	usePageTitle('Apply for a Puppy');

	const sizeOptions = form.preferredBreed ? (BREED_SIZES[form.preferredBreed] ?? []) : [];
	const secondChoiceSizeOptions = form.secondChoiceBreed ? (BREED_SIZES[form.secondChoiceBreed] ?? []) : [];
	// Same breed, different size options (excludes first choice size)
	const sameBrandAltSizeOptions = sizeOptions.filter((s) => s.value !== form.preferredSize);

	if (step === 'done') {
		// This screen should rarely show — normally Paystack redirect takes over.
		// Shown if authorizationUrl is somehow missing.
		return (
			<div className="max-w-lg mx-auto px-6 py-24 text-center">
				<div className="text-5xl mb-6">🐾</div>
				<h1 className="font-serif text-3xl font-bold text-warm-900 mb-4">Application Received!</h1>
				<p className="text-warm-600 leading-relaxed">
					Thank you for applying. You should have been redirected to complete your deposit — if not, please log in to your portal to pay.
				</p>
				<div className="mt-8 p-4 bg-white border border-warm-200 rounded-lg text-sm text-warm-700">
					<p className="font-semibold text-warm-900 mb-1">What's next?</p>
					<p>Once your deposit is received, you'll receive a magic link to log in to your client portal — where you can track your application, upload documents, and stay up to date.</p>
					<a
						href="/login"
						className="inline-block mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
					>
						Go to client login →
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-16">
			<div className="mb-8">
				<h1 className="font-serif text-3xl font-bold text-warm-900 mb-2">Puppy Application</h1>
				<p className="text-warm-500 text-sm">This form helps us ensure that our clients and families are well equipped to home one of our pups.</p>
			</div>

			<StepIndicator current={step} />

			<div className="bg-white rounded-xl border border-warm-200 p-5 md:p-8">

				{/* ── Personal ── */}
				{step === 'personal' && (
					<div className="flex flex-col gap-4">
						<h2 className="font-serif text-xl font-bold text-warm-900 mb-2">Personal Details</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Input required label="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
							<Input required label="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
						</div>
						<Input required label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
						<Input required label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Input required label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
							<Input label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
						</div>
						<Input
							label="Who will be primarily responsible for the dog's care?"
							value={form.primaryCaregiver}
							onChange={(e) => set('primaryCaregiver', e.target.value)}
							placeholder="e.g. myself, my partner…"
						/>
					</div>
				)}

				{/* ── Home & Life ── */}
				{step === 'home' && (
					<div className="flex flex-col gap-5">
						<h2 className="font-serif text-xl font-bold text-warm-900 mb-2">Home & Life</h2>

						<ButtonGroup
							label="Do you own, rent or lease your home?"
							options={[
								{ value: 'own', label: 'Own' },
								{ value: 'rent', label: 'Rent' },
								{ value: 'lease', label: 'Lease' },
							]}
							value={form.residenceOwnership}
							onChange={(v) => set('residenceOwnership', v)}
							cols={3}
						/>

						<div>
							<label className="block text-sm font-medium text-warm-700 mb-2">Type of home<span className="text-red-500 ml-0.5">*</span></label>
							<div className="grid grid-cols-3 gap-2">
								{(['house', 'townhouse', 'apartment', 'farm', 'other'] as const).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => set('livingType', t)}
										className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
											form.livingType === t
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
										}`}
									>
										{t === 'townhouse' ? 'Townhouse / Condo' : t.charAt(0).toUpperCase() + t.slice(1)}
									</button>
								))}
							</div>
							{form.livingType === 'other' && (
								<div className="mt-3">
									<Input
										label="Please describe your home type"
										value={form.otherLivingType}
										onChange={(e) => set('otherLivingType', e.target.value)}
										placeholder="e.g. smallholding, houseboat…"
									/>
								</div>
							)}
						</div>

						<Toggle label="We have a securely fenced yard" checked={form.hasGarden} onChange={(v) => set('hasGarden', v)} />
						{form.hasGarden && (
							<Input
								label="Describe the size of your yard"
								value={form.yardSize}
								onChange={(e) => set('yardSize', e.target.value)}
								placeholder="e.g. large suburban garden, small courtyard…"
							/>
						)}

						<Toggle label="We have a pool or open driveway in our yard" checked={form.hasPoolOrDriveway} onChange={(v) => set('hasPoolOrDriveway', v)} />
						{form.hasPoolOrDriveway && (
							<Toggle label="The pool / driveway is safely fenced off or closed" checked={form.poolDrivewayFenced} onChange={(v) => set('poolDrivewayFenced', v)} />
						)}

						<Toggle label="There are neighbourhood or lease restrictions on owning a dog" checked={form.neighbourhoodRestrictions} onChange={(v) => set('neighbourhoodRestrictions', v)} />
						{form.neighbourhoodRestrictions && (
							<Textarea
								label="Please describe the restrictions"
								value={form.neighbourhoodRestrictionsDetails}
								onChange={(e) => set('neighbourhoodRestrictionsDetails', e.target.value)}
							/>
						)}

						<Toggle label="The dog will spend most of its time indoors as part of the family" checked={form.dogLivesIndoors} onChange={(v) => set('dogLivesIndoors', v)} />

						<Input
							label="Where will the puppy spend time during the day?"
							value={form.puppyDaytimeLocation}
							onChange={(e) => set('puppyDaytimeLocation', e.target.value)}
							placeholder="e.g. indoors with family, in a covered outside area…"
						/>

						<Input
							label="How many hours per day will the puppy be alone?"
							value={form.hoursAlonePerDay}
							onChange={(e) => set('hoursAlonePerDay', e.target.value)}
							placeholder="e.g. 2–3 hours"
						/>

						<Toggle label="Someone is home during the day to look after the puppy" checked={form.someoneHomeDuringDay} onChange={(v) => set('someoneHomeDuringDay', v)} />
						{!form.someoneHomeDuringDay && (
							<Textarea
								label="What arrangements have you made for when the puppy is alone?"
								value={form.aloneArrangements}
								onChange={(e) => set('aloneArrangements', e.target.value)}
								placeholder="e.g. dog sitter, doggy daycare, neighbour…"
							/>
						)}

						<ButtonGroup
							label="How active is your household?"
							options={[
								{ value: 'calm', label: 'Calm' },
								{ value: 'moderate', label: 'Moderate' },
								{ value: 'active', label: 'Active' },
							]}
							value={form.activityLevel as 'calm' | 'moderate' | 'active' | ''}
							onChange={(v) => set('activityLevel', v)}
							cols={3}
						/>

						<Toggle label="All family members are on board with getting a puppy" checked={form.allFamilyMembersAgree} onChange={(v) => set('allFamilyMembersAgree', v)} />
						<Toggle label="Someone in our household has dog allergies" checked={form.allergiesToDogs} onChange={(v) => set('allergiesToDogs', v)} />

						<Toggle label="We have children in the home" checked={form.hasChildren} onChange={(v) => set('hasChildren', v)} />
						{form.hasChildren && (
							<Input
								label="Children's genders and ages"
								value={form.childrenGenderAges}
								onChange={(e) => set('childrenGenderAges', e.target.value)}
								placeholder="e.g. girl 6, boy 9…"
							/>
						)}

						<Toggle label="We have other pets" checked={form.hasOtherPets} onChange={(v) => set('hasOtherPets', v)} />
						{form.hasOtherPets && (
							<Textarea
								label="Describe your other pets"
								value={form.otherPetsDescription}
								onChange={(e) => set('otherPetsDescription', e.target.value)}
							/>
						)}
					</div>
				)}

				{/* ── Experience ── */}
				{step === 'experience' && (
					<div className="flex flex-col gap-5">
						<h2 className="font-serif text-xl font-bold text-warm-900 mb-2">Experience</h2>

						<Toggle
							label="I've owned dogs before"
							checked={form.previousDogExperience}
							onChange={(v) => set('previousDogExperience', v)}
						/>
						{form.previousDogExperience && (
							<>
								<Input
									label="What breeds have you owned in the past?"
									value={form.breedsOwnedPast}
									onChange={(e) => set('breedsOwnedPast', e.target.value)}
									placeholder="e.g. Labrador, Border Collie…"
								/>
								<Textarea
									label="Tell us about your experience"
									value={form.experienceDescription}
									onChange={(e) => set('experienceDescription', e.target.value)}
								/>
							</>
						)}

						<Toggle
							label="I have at some point returned a pet to its breeder"
							checked={form.returnedPetToBreeder}
							onChange={(v) => set('returnedPetToBreeder', v)}
						/>
						{form.returnedPetToBreeder && (
							<Textarea
								label="Please describe the circumstances"
								value={form.returnedPetDetails}
								onChange={(e) => set('returnedPetDetails', e.target.value)}
							/>
						)}

						<Toggle
							label="I have at some point given a pet away"
							checked={form.givenPetAway}
							onChange={(v) => set('givenPetAway', v)}
						/>
						{form.givenPetAway && (
							<Textarea
								label="What were the circumstances?"
								value={form.givenPetAwayDetails}
								onChange={(e) => set('givenPetAwayDetails', e.target.value)}
							/>
						)}

						<Toggle
							label="I am willing to take the dog to obedience classes"
							checked={form.willingForObedienceClasses}
							onChange={(v) => set('willingForObedienceClasses', v)}
						/>

						<Textarea
							label="References (optional)"
							value={form.references}
							onChange={(e) => set('references', e.target.value)}
							placeholder="Please list 2 references with name, phone and email — e.g. vet, trainer or personal reference…"
						/>
					</div>
				)}

				{/* ── Puppy Preferences ── */}
				{step === 'preferences' && (
					<div className="flex flex-col gap-5">
						<h2 className="font-serif text-xl font-bold text-warm-900 mb-2">Puppy Preferences</h2>

						<Textarea
							required
						label="For what purpose(s) are you purchasing a puppy?"
							value={form.puppyPurpose}
							onChange={(e) => set('puppyPurpose', e.target.value)}
							placeholder="e.g. family companion, therapy dog…"
						/>

						<ButtonGroup
							required
						label="When would you be ready to adopt a puppy?"
							options={[
								{ value: 'asap', label: 'As soon as possible' },
								{ value: '6_months', label: 'In about 6 months' },
								{ value: '1_year', label: 'In about a year' },
							]}
							value={form.readyTimeframe}
							onChange={(v) => set('readyTimeframe', v)}
							cols={3}
						/>

						{/* Breed selector */}
						<div>
							<label className="block text-sm font-medium text-warm-700 mb-2">Preferred breed<span className="text-red-500 ml-0.5">*</span></label>
							<div className="flex flex-col gap-2">
								{BREEDS.map((b) => (
									<button
										key={b.value}
										type="button"
										onClick={() => handleBreedChange(b.value)}
										className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
											form.preferredBreed === b.value
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
										}`}
									>
										<span className="font-semibold">{b.label}</span>
										<span className="ml-2 font-normal text-warm-400">{b.detail}</span>
									</button>
								))}
							</div>
						</div>

						{/* Size selector — shown after breed is chosen, hidden if only one (auto-selected) */}
						{form.preferredBreed && sizeOptions.length > 1 && (
							<div>
								<label className="block text-sm font-medium text-warm-700 mb-2">Preferred size<span className="text-red-500 ml-0.5">*</span></label>
								<div className="flex flex-col gap-2">
									{sizeOptions.map((s) => (
										<button
											key={s.value}
											type="button"
											onClick={() => set('preferredSize', s.value)}
											className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
												form.preferredSize === s.value
													? 'bg-brand-50 border-brand-400 text-brand-700'
													: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
											}`}
										>
											<span className="font-semibold">{s.label}</span>
											<span className="ml-2 font-normal text-warm-400">{s.detail}</span>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Show auto-selected size as info */}
						{form.preferredBreed && sizeOptions.length === 1 && (
							<div>
								<label className="block text-sm font-medium text-warm-300 mb-2">Preferred size</label>
								<div className="px-4 py-3 rounded-lg bg-warm-50 border border-warm-200 text-sm text-warm-400">
									<span className="font-medium">{sizeOptions[0].label}</span>
									<span className="ml-2">{sizeOptions[0].detail}</span>
								</div>
							</div>
						)}

						<Toggle
							label="Do you have a second choice breed?"
							checked={form.hasSecondChoiceBreed}
							onChange={(v) => {
								setForm((f) => ({ ...f, hasSecondChoiceBreed: v, secondChoiceBreed: '', secondChoiceSize: '', hasSecondChoiceSize: false }));
							}}
						/>

						{/* Second choice breed flow */}
						{form.hasSecondChoiceBreed && (
							<>
								<div>
									<label className="block text-sm font-medium text-warm-700 mb-2">Second choice breed</label>
									<div className="flex flex-col gap-2">
										{BREEDS.filter((b) => b.value !== form.preferredBreed).map((b) => (
											<button
												key={b.value}
												type="button"
												onClick={() => handleSecondBreedChange(b.value)}
												className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
													form.secondChoiceBreed === b.value
														? 'bg-brand-50 border-brand-400 text-brand-700'
														: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
												}`}
											>
												<span className="font-semibold">{b.label}</span>
												<span className="ml-2 font-normal text-warm-400">{b.detail}</span>
											</button>
										))}
									</div>
								</div>

								{form.secondChoiceBreed && secondChoiceSizeOptions.length > 1 && (
									<div>
										<label className="block text-sm font-medium text-warm-700 mb-2">Second choice size</label>
										<div className="flex flex-col gap-2">
											{secondChoiceSizeOptions.map((s) => (
												<button
													key={s.value}
													type="button"
													onClick={() => set('secondChoiceSize', s.value)}
													className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
														form.secondChoiceSize === s.value
															? 'bg-brand-50 border-brand-400 text-brand-700'
															: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
													}`}
												>
													<span className="font-semibold">{s.label}</span>
													<span className="ml-2 font-normal text-warm-400">{s.detail}</span>
												</button>
											))}
										</div>
									</div>
								)}

								{form.secondChoiceBreed && secondChoiceSizeOptions.length === 1 && (
									<div>
										<label className="block text-sm font-medium text-warm-300 mb-2">Second choice size</label>
										<div className="px-4 py-3 rounded-lg bg-warm-50 border border-warm-200 text-sm text-warm-400">
											<span className="font-medium">{secondChoiceSizeOptions[0].label}</span>
											<span className="ml-2">{secondChoiceSizeOptions[0].detail}</span>
										</div>
									</div>
								)}
							</>
						)}

						{/* Second choice size (same breed) flow — only if no second breed chosen */}
						{!form.hasSecondChoiceBreed && sameBrandAltSizeOptions.length > 0 && (
							<Toggle
								label="Do you have a second choice size?"
								checked={form.hasSecondChoiceSize}
								onChange={(v) => {
									setForm((f) => ({ ...f, hasSecondChoiceSize: v, secondChoiceSize: '' }));
								}}
							/>
						)}

						{!form.hasSecondChoiceBreed && form.hasSecondChoiceSize && sameBrandAltSizeOptions.length > 0 && (
							<div>
								<label className="block text-sm font-medium text-warm-700 mb-2">Second choice size</label>
								<div className="flex flex-col gap-2">
									{sameBrandAltSizeOptions.map((s) => (
										<button
											key={s.value}
											type="button"
											onClick={() => set('secondChoiceSize', s.value)}
											className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
												form.secondChoiceSize === s.value
													? 'bg-brand-50 border-brand-400 text-brand-700'
													: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
											}`}
										>
											<span className="font-semibold">{s.label}</span>
											<span className="ml-2 font-normal text-warm-400">{s.detail}</span>
										</button>
									))}
								</div>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-warm-700 mb-2">Preferred sex<span className="text-red-500 ml-0.5">*</span></label>
							<div className="flex gap-2">
								{(['male', 'female', 'no_preference'] as const).map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => set('preferredSex', s)}
										className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
											form.preferredSex === s
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
										}`}
									>
										{s === 'no_preference' ? 'No preference' : s.charAt(0).toUpperCase() + s.slice(1)}
									</button>
								))}
							</div>
						</div>

						<Toggle
							label="I would consider the opposite sex if my preference is unavailable"
							checked={form.considerOppositeSex}
							onChange={(v) => set('considerOppositeSex', v)}
						/>

						<Input
							required
							label="Preferred colour"
							value={form.preferredColour}
							onChange={(e) => set('preferredColour', e.target.value)}
							placeholder="e.g. cream, apricot, chocolate and white…"
						/>

						<Toggle
							label="I would consider a different colour if my preference is unavailable"
							checked={form.considerOtherColour}
							onChange={(v) => set('considerOtherColour', v)}
						/>

						<ButtonGroup
							label="Are you looking for a calm or more active puppy?"
							options={[
								{ value: 'calm', label: 'Calm' },
								{ value: 'moderate', label: 'Moderate' },
								{ value: 'active', label: 'Active' },
							]}
							value={form.puppyEnergyPreference}
							onChange={(v) => set('puppyEnergyPreference', v)}
							cols={3}
						/>

						<ButtonGroup
							label="What is your budget for a puppy?"
							options={[
								{ value: 'r5k_r10k', label: 'R5k – R10k' },
								{ value: 'r10k_r20k', label: 'R10k – R20k' },
								{ value: 'r30k_r40k', label: 'R30k – R40k' },
								{ value: 'r40k_plus', label: 'R40k+' },
							]}
							value={form.budget}
							onChange={(v) => set('budget', v as FormData['budget'])}
							cols={2}
						/>

						<Toggle
							label="I would consider adopting a rehome case (an older dog whose circumstances have changed)"
							checked={form.considerRehome}
							onChange={(v) => set('considerRehome', v)}
						/>

						<div className="mt-2 p-4 bg-warm-50 rounded-lg border border-warm-200 text-sm text-warm-600 leading-relaxed">
							All companion puppies are sold with copies of parent registration papers and a spay/neuter contract.
							By the age of 15 months your companion dog must be spayed or neutered and the certificate emailed to us as proof.
							Our dogs are sold as pets only and not for breeding purposes.
						</div>
						<Toggle
							required
							label="I agree to the terms above"
							checked={form.agreedToContract}
							onChange={(v) => set('agreedToContract', v)}
						/>
					</div>
				)}


				{/* ── Deposit ── */}
				{step === 'deposit' && (
					<div className="flex flex-col gap-6">
						<div>
							<h2 className="font-serif text-xl font-bold text-warm-900 mb-1">Deposit & Waiting List</h2>
							<p className="text-sm text-warm-500">Choose your waiting list. You'll be taken to our secure payment page to complete your deposit immediately after submitting.</p>
						</div>

						<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 leading-relaxed">
							<span className="font-semibold">How the waiting list works:</span> Puppies are offered to the R5,000 secured list first, then the R500 standard list — in that order of priority.
						</div>

						<div>
							<p className="text-sm font-medium text-warm-700 mb-3">Which list would you like to join?<span className="text-red-500 ml-0.5">*</span></p>
							<div className="flex flex-col gap-3">

								{/* R5,000 secured deposit */}
								<button
									type="button"
									onClick={() => set('depositTier', 'r5000')}
									className={`flex flex-col gap-3 p-5 rounded-xl border-2 text-left transition-all ${form.depositTier === 'r5000' ? 'border-brand-400 bg-brand-50' : 'border-warm-200 bg-white hover:border-warm-300'}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-2xl">⭐</span>
											<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200">Highest priority</span>
										</div>
										{form.depositTier === 'r5000' && (
											<span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">Selected</span>
										)}
									</div>
									<div>
										<p className="font-semibold text-warm-900 text-sm">Secured Waiting List — R5,000 deposit</p>
										<p className="text-xs text-warm-500 mt-1">First to be notified when puppies are born. You choose first from the litter. Your deposit counts towards the final puppy price.</p>
									</div>
									<ul className="text-xs text-warm-600 space-y-1">
										<li className="flex items-center gap-1.5"><span className="text-brand-500">✓</span> Notified first when a litter is born</li>
										<li className="flex items-center gap-1.5"><span className="text-brand-500">✓</span> First pick from the litter</li>
										<li className="flex items-center gap-1.5"><span className="text-brand-500">✓</span> Deposit applied to final puppy price</li>
									</ul>
								</button>

								{/* R500 standard list fee */}
								<button
									type="button"
									onClick={() => set('depositTier', 'r500')}
									className={`flex flex-col gap-3 p-5 rounded-xl border-2 text-left transition-all ${form.depositTier === 'r500' ? 'border-brand-400 bg-brand-50' : 'border-warm-200 bg-white hover:border-warm-300'}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-2xl">🐾</span>
											<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 border border-warm-200">Second priority</span>
										</div>
										{form.depositTier === 'r500' && (
											<span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">Selected</span>
										)}
									</div>
									<div>
										<p className="font-semibold text-warm-900 text-sm">Standard Waiting List — R500 list fee</p>
										<p className="text-xs text-warm-500 mt-1">Offered puppies still available after the secured list. A further R4,500 booking deposit is required when you choose a puppy.</p>
									</div>
									<ul className="text-xs text-warm-600 space-y-1">
										<li className="flex items-center gap-1.5"><span className="text-brand-500">✓</span> Offered puppies after secured-list families</li>
										<li className="flex items-center gap-1.5"><span className="text-brand-500">✓</span> R500 applied to final puppy price</li>
										<li className="flex items-center gap-1.5"><span className="text-brand-500">✓</span> Can upgrade to secured list at any time</li>
									</ul>
								</button>

							</div>
						</div>

						<div className="flex flex-col gap-4 pt-2">
							<Toggle
								label="I am happy to take out pet insurance for an initial trial month"
								checked={form.petInsurance}
								onChange={(v) => set('petInsurance', v)}
							/>
							<Toggle
								label="I would like assistance with settling my puppy and potty training guidance"
								checked={form.wantsSettlingGuidance}
								onChange={(v) => set('wantsSettlingGuidance', v)}
							/>
						</div>
					</div>
				)}

				{/* ── Confirm ── */}
				{step === 'confirm' && (
					<div className="flex flex-col gap-5">
						<div>
							<h2 className="font-serif text-xl font-bold text-warm-900 mb-1">Review & Confirm</h2>
							<p className="text-sm text-warm-500">Please review your selection before submitting.</p>
						</div>

						<div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
							<p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Selected waiting list</p>
							{form.depositTier === 'r5000' ? (
								<>
									<p className="font-semibold text-warm-900 text-sm">Secured Waiting List — R5,000 deposit</p>
									<p className="text-xs text-warm-500 mt-0.5">Highest priority — first to be offered puppies from each litter.</p>
								</>
							) : (
								<>
									<p className="font-semibold text-warm-900 text-sm">Standard Waiting List — R500 list fee</p>
									<p className="text-xs text-warm-500 mt-0.5">Second priority — offered puppies remaining after the secured list.</p>
								</>
							)}
						</div>

						<div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed space-y-2">
							<p>
								<span className="font-semibold">Next step:</span> After submitting, you will be redirected to our secure payment page to complete your {form.depositTier === 'r5000' ? 'R5,000 deposit' : 'R500 list fee'}.
							</p>
							<p>Once payment is confirmed, you will be directed to your client portal where you can track your application, upload documents, and stay up to date.</p>
						</div>
					</div>
				)}

				{error && (
					<p role="alert" className="text-red-600 text-sm px-1">{error}</p>
				)}

				{/* Navigation */}
				<div className="flex justify-between mt-8 pt-6 border-t border-black/[0.05]">
					{step !== 'personal' ? (
						<button onClick={back} className="px-5 py-2.5 text-sm font-medium text-warm-600 hover:text-warm-800">
							← Back
						</button>
					) : <div />}

					{step !== 'confirm' ? (
						<button
							onClick={next}
							className="px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
						>
							Continue →
						</button>
					) : (
						<button
							onClick={submit}
							disabled={submitting}
							className="px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
						>
							{submitting ? 'Submitting…' : 'Submit & Pay Deposit'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
