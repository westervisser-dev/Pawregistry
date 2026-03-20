import { useState } from 'react';
import { api } from '@/lib/api';

type Step = 'personal' | 'home' | 'experience' | 'preferences' | 'done';

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
};

const steps: Step[] = ['personal', 'home', 'experience', 'preferences', 'done'];

const BREEDS = [
	{ value: 'f1_goldendoodle', label: 'F1 Goldendoodle', detail: 'Golden Retriever × Poodle' },
	{ value: 'f1b_goldendoodle', label: 'F1b Goldendoodle', detail: 'F1 Goldendoodle × Poodle' },
	{ value: 'f1_border_doodle', label: 'F1 Border Doodle', detail: 'Border Collie × Poodle' },
	{ value: 'f1_mini_biewer_doodle', label: 'F1 Mini Biewer Doodle', detail: 'Biewer Terrier × Mini Poodle' },
	{ value: 'red_tuxedo_french_poodle', label: 'Red Tuxedo French Poodle', detail: 'Pure bred poodle' },
];

const BREED_SIZES: Record<string, { value: string; label: string; detail: string }[]> = {
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

function StepIndicator({ current }: { current: Step }) {
	const labels = ['Personal', 'Home & Life', 'Experience', 'Preferences'];
	const currentIdx = steps.indexOf(current);
	return (
		<div className="flex items-center gap-0 mb-10">
			{labels.map((label, i) => (
				<div key={label} className="flex items-center flex-1 sm:flex-none">
					<div className="flex flex-col items-center">
						<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
							i < currentIdx ? 'bg-brand-500 text-white' :
							i === currentIdx ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
							'bg-stone-100 text-stone-400'
						}`}>
							{i < currentIdx ? '✓' : i + 1}
						</div>
						<span className={`text-xs mt-1 hidden sm:block ${i === currentIdx ? 'text-brand-600 font-medium' : 'text-stone-400'}`}>
							{label}
						</span>
						<span className={`text-xs mt-1 sm:hidden ${i === currentIdx ? 'text-brand-600 font-medium' : 'text-stone-400'}`}>
							{i === currentIdx ? label : ''}
						</span>
					</div>
					{i < labels.length - 1 && (
						<div className={`h-px flex-1 sm:w-16 sm:flex-none mx-2 mb-5 ${i < currentIdx ? 'bg-brand-300' : 'bg-stone-200'}`} />
					)}
				</div>
			))}
		</div>
	);
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<div>
			<label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
			<input
				{...props}
				className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
			/>
		</div>
	);
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<div>
			<label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
			<textarea
				{...props}
				rows={3}
				className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 resize-none"
			/>
		</div>
	);
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center gap-3 cursor-pointer">
			<div
				onClick={() => onChange(!checked)}
				className={`w-10 h-6 rounded-full transition-colors flex items-center ${checked ? 'bg-brand-500' : 'bg-stone-200'}`}
			>
				<div className={`w-4 h-4 rounded-full bg-white shadow mx-1 transition-transform ${checked ? 'translate-x-4' : ''}`} />
			</div>
			<span className="text-sm text-stone-700">{label}</span>
		</label>
	);
}

function ButtonGroup<T extends string>({
	label,
	options,
	value,
	onChange,
	cols = 2,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T | '';
	onChange: (v: T) => void;
	cols?: number;
}) {
	// On mobile always use 2 cols max; on sm+ use the specified cols
	const gridClass = cols === 3
		? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
		: 'grid grid-cols-2 gap-2';
	return (
		<div>
			<label className="block text-sm font-medium text-stone-700 mb-2">{label}</label>
			<div className={gridClass}>
				{options.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => onChange(opt.value)}
						className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
							value === opt.value
								? 'bg-brand-50 border-brand-400 text-brand-700'
								: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
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

	const next = () => setStep(steps[steps.indexOf(step) + 1] as Step);
	const back = () => setStep(steps[steps.indexOf(step) - 1] as Step);

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
		if (!form.agreedToContract) { setError('You must agree to the terms.'); return; }
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
		const { error: apiError } = await api.clients.apply.post({
			firstName: form.firstName,
			lastName: form.lastName,
			email: form.email,
			phone: form.phone || undefined,
			city: form.city || undefined,
			country: form.country,
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
			},
		});
		setSubmitting(false);
		if (apiError) { setError('Submission failed. Please try again.'); return; }
		setStep('done');
	};

	if (step === 'done') {
		return (
			<div className="max-w-lg mx-auto px-6 py-24 text-center">
				<div className="text-5xl mb-6">🐾</div>
				<h1 className="font-serif text-3xl font-bold text-stone-900 mb-4">Application Received!</h1>
				<p className="text-stone-600 leading-relaxed">
					Thank you for applying. We'll review your application and be in touch within a few days.
				</p>
			</div>
		);
	}

	const sizeOptions = form.preferredBreed ? (BREED_SIZES[form.preferredBreed] ?? []) : [];
	const secondChoiceSizeOptions = form.secondChoiceBreed ? (BREED_SIZES[form.secondChoiceBreed] ?? []) : [];
	// Same breed, different size options (excludes first choice size)
	const sameBrandAltSizeOptions = sizeOptions.filter((s) => s.value !== form.preferredSize);

	return (
		<div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-16">
			<div className="mb-8">
				<h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">Puppy Application</h1>
				<p className="text-stone-500 text-sm">This form helps us ensure that our clients and families are well equipped to home one of our pups.</p>
			</div>

			<StepIndicator current={step} />

			<div className="bg-white rounded-xl border border-stone-200 p-5 md:p-8">

				{/* ── Personal ── */}
				{step === 'personal' && (
					<div className="flex flex-col gap-4">
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Personal Details</h2>
						<div className="grid grid-cols-2 gap-4">
							<Input label="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
							<Input label="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
						</div>
						<Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
						<Input label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
						<div className="grid grid-cols-2 gap-4">
							<Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
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
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Home & Life</h2>

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
							<label className="block text-sm font-medium text-stone-700 mb-2">Type of home</label>
							<div className="grid grid-cols-3 gap-2">
								{(['house', 'townhouse', 'apartment', 'farm', 'other'] as const).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => set('livingType', t)}
										className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
											form.livingType === t
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
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

						<Textarea
							label="Describe your activity level and hobbies"
							value={form.activityLevel}
							onChange={(e) => set('activityLevel', e.target.value)}
							placeholder="e.g. active, enjoy hiking and outdoor activities…"
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
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Experience</h2>

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
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Puppy Preferences</h2>

						<Textarea
							label="For what purpose(s) are you purchasing a puppy?"
							value={form.puppyPurpose}
							onChange={(e) => set('puppyPurpose', e.target.value)}
							placeholder="e.g. family companion, therapy dog…"
						/>

						<ButtonGroup
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
							<label className="block text-sm font-medium text-stone-700 mb-2">Preferred breed</label>
							<div className="flex flex-col gap-2">
								{BREEDS.map((b) => (
									<button
										key={b.value}
										type="button"
										onClick={() => handleBreedChange(b.value)}
										className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
											form.preferredBreed === b.value
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
										}`}
									>
										<span className="font-semibold">{b.label}</span>
										<span className="ml-2 font-normal text-stone-400">{b.detail}</span>
									</button>
								))}
							</div>
						</div>

						{/* Size selector — shown after breed is chosen, hidden if only one (auto-selected) */}
						{form.preferredBreed && sizeOptions.length > 1 && (
							<div>
								<label className="block text-sm font-medium text-stone-700 mb-2">Preferred size</label>
								<div className="flex flex-col gap-2">
									{sizeOptions.map((s) => (
										<button
											key={s.value}
											type="button"
											onClick={() => set('preferredSize', s.value)}
											className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
												form.preferredSize === s.value
													? 'bg-brand-50 border-brand-400 text-brand-700'
													: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
											}`}
										>
											<span className="font-semibold">{s.label}</span>
											<span className="ml-2 font-normal text-stone-400">{s.detail}</span>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Show auto-selected size as info */}
						{form.preferredBreed && sizeOptions.length === 1 && (
							<div>
								<label className="block text-sm font-medium text-stone-300 mb-2">Preferred size</label>
								<div className="px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-400">
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
									<label className="block text-sm font-medium text-stone-700 mb-2">Second choice breed</label>
									<div className="flex flex-col gap-2">
										{BREEDS.filter((b) => b.value !== form.preferredBreed).map((b) => (
											<button
												key={b.value}
												type="button"
												onClick={() => handleSecondBreedChange(b.value)}
												className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
													form.secondChoiceBreed === b.value
														? 'bg-brand-50 border-brand-400 text-brand-700'
														: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
												}`}
											>
												<span className="font-semibold">{b.label}</span>
												<span className="ml-2 font-normal text-stone-400">{b.detail}</span>
											</button>
										))}
									</div>
								</div>

								{form.secondChoiceBreed && secondChoiceSizeOptions.length > 1 && (
									<div>
										<label className="block text-sm font-medium text-stone-700 mb-2">Second choice size</label>
										<div className="flex flex-col gap-2">
											{secondChoiceSizeOptions.map((s) => (
												<button
													key={s.value}
													type="button"
													onClick={() => set('secondChoiceSize', s.value)}
													className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
														form.secondChoiceSize === s.value
															? 'bg-brand-50 border-brand-400 text-brand-700'
															: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
													}`}
												>
													<span className="font-semibold">{s.label}</span>
													<span className="ml-2 font-normal text-stone-400">{s.detail}</span>
												</button>
											))}
										</div>
									</div>
								)}

								{form.secondChoiceBreed && secondChoiceSizeOptions.length === 1 && (
									<div>
										<label className="block text-sm font-medium text-stone-300 mb-2">Second choice size</label>
										<div className="px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-400">
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
								<label className="block text-sm font-medium text-stone-700 mb-2">Second choice size</label>
								<div className="flex flex-col gap-2">
									{sameBrandAltSizeOptions.map((s) => (
										<button
											key={s.value}
											type="button"
											onClick={() => set('secondChoiceSize', s.value)}
											className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors ${
												form.secondChoiceSize === s.value
													? 'bg-brand-50 border-brand-400 text-brand-700'
													: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
											}`}
										>
											<span className="font-semibold">{s.label}</span>
											<span className="ml-2 font-normal text-stone-400">{s.detail}</span>
										</button>
									))}
								</div>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-stone-700 mb-2">Preferred sex</label>
							<div className="flex gap-2">
								{(['male', 'female', 'no_preference'] as const).map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => set('preferredSex', s)}
										className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
											form.preferredSex === s
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
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
							label="Preferred colour (optional)"
							value={form.preferredColour}
							onChange={(e) => set('preferredColour', e.target.value)}
							placeholder="e.g. cream, apricot, chocolate and white…"
						/>

						<Toggle
							label="I would consider a different colour if my preference is unavailable"
							checked={form.considerOtherColour}
							onChange={(v) => set('considerOtherColour', v)}
						/>

						<Toggle
							label="I would consider adopting a rehome case (an older dog whose circumstances have changed)"
							checked={form.considerRehome}
							onChange={(v) => set('considerRehome', v)}
						/>

						<div className="mt-2 p-4 bg-stone-50 rounded-lg border border-stone-200 text-sm text-stone-600 leading-relaxed">
							All companion puppies are sold with copies of parent registration papers and a spay/neuter contract.
							By the age of 15 months your companion dog must be spayed or neutered and the certificate emailed to us as proof.
							Our dogs are sold as pets only and not for breeding purposes.
						</div>
						<Toggle
							label="I agree to the terms above"
							checked={form.agreedToContract}
							onChange={(v) => set('agreedToContract', v)}
						/>
						{error && <p className="text-red-600 text-sm">{error}</p>}
					</div>
				)}

				{/* Navigation */}
				<div className="flex justify-between mt-8 pt-6 border-t border-stone-100">
					{step !== 'personal' ? (
						<button onClick={back} className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800">
							← Back
						</button>
					) : <div />}

					{step !== 'preferences' ? (
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
							{submitting ? 'Submitting…' : 'Submit Application'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
