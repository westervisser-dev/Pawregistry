import { useState } from 'react';
import { api } from '@/lib/api';

type Step = 'personal' | 'home' | 'experience' | 'preferences' | 'done';

interface FormData {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	city: string;
	country: string;
	livingType: 'house' | 'apartment' | 'farm' | 'other';
	hasGarden: boolean;
	hasChildren: boolean;
	hasOtherPets: boolean;
	otherPetsDescription: string;
	previousDogExperience: boolean;
	experienceDescription: string;
	preferredSex: 'male' | 'female' | 'no_preference';
	preferredColour: string;
	reasonForBreed: string;
	references: string;
	agreedToContract: boolean;
}

const initial: FormData = {
	firstName: '', lastName: '', email: '', phone: '', city: '', country: 'ZA',
	livingType: 'house', hasGarden: false, hasChildren: false, hasOtherPets: false,
	otherPetsDescription: '', previousDogExperience: false, experienceDescription: '',
	preferredSex: 'no_preference', preferredColour: '', reasonForBreed: '', references: '',
	agreedToContract: false,
};

const steps: Step[] = ['personal', 'home', 'experience', 'preferences', 'done'];

function StepIndicator({ current }: { current: Step }) {
	const labels = ['Personal', 'Home', 'Experience', 'Preferences'];
	const currentIdx = steps.indexOf(current);
	return (
		<div className="flex items-center gap-0 mb-10">
			{labels.map((label, i) => (
				<div key={label} className="flex items-center">
					<div className="flex flex-col items-center">
						<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
							i < currentIdx ? 'bg-brand-500 text-white' :
							i === currentIdx ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
							'bg-stone-100 text-stone-400'
						}`}>
							{i < currentIdx ? '✓' : i + 1}
						</div>
						<span className={`text-xs mt-1 ${i === currentIdx ? 'text-brand-600 font-medium' : 'text-stone-400'}`}>
							{label}
						</span>
					</div>
					{i < labels.length - 1 && (
						<div className={`h-px w-16 mx-2 mb-5 ${i < currentIdx ? 'bg-brand-300' : 'bg-stone-200'}`} />
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
				rows={4}
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

export function ApplyPage() {
	const [step, setStep] = useState<Step>('personal');
	const [form, setForm] = useState<FormData>(initial);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const set = (key: keyof FormData, value: FormData[keyof FormData]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const next = () => setStep(steps[steps.indexOf(step) + 1] as Step);
	const back = () => setStep(steps[steps.indexOf(step) - 1] as Step);

	const submit = async () => {
		if (!form.agreedToContract) { setError('You must agree to the terms.'); return; }
		setSubmitting(true);
		const { error: apiError } = await api.clients.apply.post({
			firstName: form.firstName,
			lastName: form.lastName,
			email: form.email,
			phone: form.phone || undefined,
			city: form.city || undefined,
			country: form.country,
			applicationData: {
				livingType: form.livingType,
				hasGarden: form.hasGarden,
				hasChildren: form.hasChildren,
				childrenAges: [],
				hasOtherPets: form.hasOtherPets,
				otherPetsDescription: form.otherPetsDescription || null,
				previousDogExperience: form.previousDogExperience,
				experienceDescription: form.experienceDescription || null,
				preferredSex: form.preferredSex,
				preferredColour: form.preferredColour || null,
				reasonForBreed: form.reasonForBreed,
				references: form.references || null,
				agreedToContract: form.agreedToContract,
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

	return (
		<div className="max-w-2xl mx-auto px-6 py-16">
			<div className="mb-8">
				<h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">Puppy Application</h1>
				<p className="text-stone-500 text-sm">This form helps us find the right match for you and your family.</p>
			</div>

			<StepIndicator current={step} />

			<div className="bg-white rounded-xl border border-stone-200 p-8">
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
					</div>
				)}

				{step === 'home' && (
					<div className="flex flex-col gap-5">
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Your Home</h2>
						<div>
							<label className="block text-sm font-medium text-stone-700 mb-2">Type of home</label>
							<div className="grid grid-cols-2 gap-2">
								{(['house', 'apartment', 'farm', 'other'] as const).map((t) => (
									<button
										key={t}
										onClick={() => set('livingType', t)}
										className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
											form.livingType === t
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
										}`}
									>
										{t.charAt(0).toUpperCase() + t.slice(1)}
									</button>
								))}
							</div>
						</div>
						<Toggle label="We have a garden or yard" checked={form.hasGarden} onChange={(v) => set('hasGarden', v)} />
						<Toggle label="We have children" checked={form.hasChildren} onChange={(v) => set('hasChildren', v)} />
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

				{step === 'experience' && (
					<div className="flex flex-col gap-5">
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Experience</h2>
						<Toggle
							label="I've owned dogs before"
							checked={form.previousDogExperience}
							onChange={(v) => set('previousDogExperience', v)}
						/>
						{form.previousDogExperience && (
							<Textarea
								label="Tell us about your experience"
								value={form.experienceDescription}
								onChange={(e) => set('experienceDescription', e.target.value)}
							/>
						)}
						<Textarea
							label="Why this breed?"
							value={form.reasonForBreed}
							onChange={(e) => set('reasonForBreed', e.target.value)}
							placeholder="Tell us why you've chosen this breed and what draws you to it…"
						/>
						<Textarea
							label="References (optional)"
							value={form.references}
							onChange={(e) => set('references', e.target.value)}
							placeholder="Vet name/contact, trainer, or other reference…"
						/>
					</div>
				)}

				{step === 'preferences' && (
					<div className="flex flex-col gap-5">
						<h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Preferences</h2>
						<div>
							<label className="block text-sm font-medium text-stone-700 mb-2">Preferred sex</label>
							<div className="flex gap-2">
								{(['male', 'female', 'no_preference'] as const).map((s) => (
									<button
										key={s}
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
						<Input
							label="Preferred colour (optional)"
							value={form.preferredColour}
							onChange={(e) => set('preferredColour', e.target.value)}
							placeholder="e.g. cream, apricot…"
						/>
						<div className="mt-2 p-4 bg-stone-50 rounded-lg border border-stone-200 text-sm text-stone-600 leading-relaxed">
							By submitting this application, you agree that we may use your details to contact you about
							puppy availability. We do not share your information with third parties.
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
