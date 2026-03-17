import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Badge } from '@/components/ui';
import type { Dog, HealthCert } from '@paw-registry/shared';

type DogWithPedigree = Dog & {
	sire: DogWithPedigree | null;
	dam: DogWithPedigree | null;
	healthCerts: HealthCert[];
};

type PedigreeTree = Dog & {
	sire: PedigreeTree | null;
	dam: PedigreeTree | null;
};

function PedigreeNode({ dog, depth }: { dog: PedigreeTree; depth: number }) {
	if (depth > 3) return null;
	const fontSize = depth === 0 ? 'text-sm font-semibold' : 'text-xs';
	const boxSize = depth === 0 ? 'min-w-40 p-3' : 'min-w-32 p-2';

	return (
		<div className="flex items-center gap-2">
			<div className={`bg-white border border-stone-200 rounded-lg ${boxSize} flex-shrink-0`}>
				<p className={`${fontSize} text-stone-900 truncate`}>{dog.name}</p>
				<p className="text-xs text-stone-400 truncate">{dog.colour}</p>
				{depth < 2 && (
					<Badge variant={dog.sex === 'male' ? 'blue' : 'purple'}>
						{dog.sex === 'male' ? '♂' : '♀'}
					</Badge>
				)}
			</div>
			{(dog.sire || dog.dam) && depth < 3 && (
				<div className="flex flex-col gap-2">
					{dog.sire && (
						<div className="flex items-center gap-1">
							<div className="w-4 h-px bg-stone-300" />
							<PedigreeNode dog={dog.sire} depth={depth + 1} />
						</div>
					)}
					{dog.dam && (
						<div className="flex items-center gap-1">
							<div className="w-4 h-px bg-stone-300" />
							<PedigreeNode dog={dog.dam} depth={depth + 1} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}

const certLabels: Record<string, string> = {
	ofa_hips: 'OFA Hips',
	ofa_elbows: 'OFA Elbows',
	ofa_eyes: 'OFA Eyes',
	ofa_heart: 'OFA Heart',
	dna_panel: 'DNA Panel',
	brucellosis: 'Brucellosis',
	other: 'Other',
};

const resultVariant: Record<string, 'green' | 'amber' | 'red' | 'default'> = {
	pass: 'green',
	excellent: 'green',
	good: 'green',
	fair: 'amber',
	pending: 'amber',
	fail: 'red',
};

export function DogProfilePage() {
	const { id } = useParams<{ id: string }>();
	const [dog, setDog] = useState<DogWithPedigree | null>(null);
	const [pedigree, setPedigree] = useState<PedigreeTree | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) return;
		Promise.all([
			api.dogs({ id }).get(),
			api.dogs({ id }).pedigree.get(),
		]).then(([dogRes, pedigreeRes]) => {
			if (dogRes.data) setDog(dogRes.data as DogWithPedigree);
			if (pedigreeRes.data) setPedigree(pedigreeRes.data as PedigreeTree);
			setLoading(false);
		});
	}, [id]);

	if (loading) return <LoadingPage />;
	if (!dog) return <div className="p-16 text-center text-stone-500">Dog not found.</div>;

	return (
		<div className="max-w-5xl mx-auto px-6 py-16">
			<Link to="/dogs" className="text-sm text-stone-500 hover:text-stone-700 mb-8 inline-block">
				← All Dogs
			</Link>

			{/* Profile header */}
			<div className="flex flex-col md:flex-row gap-8 mb-12">
				<div className="w-full md:w-72 h-72 bg-stone-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
					{dog.profileImageUrl ? (
						<img src={dog.profileImageUrl} alt={dog.name} className="w-full h-full object-cover" />
					) : (
						<span className="text-6xl">🐕</span>
					)}
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-1">
						<h1 className="font-serif text-4xl font-bold text-stone-900">{dog.name}</h1>
						<Badge variant={dog.sex === 'male' ? 'blue' : 'purple'}>{dog.sex}</Badge>
					</div>
					{dog.registeredName && (
						<p className="text-stone-400 text-sm mb-4">{dog.registeredName}</p>
					)}
					<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
						{[
							{ label: 'Breed', value: dog.breed },
							{ label: 'Colour', value: dog.colour },
							{ label: 'Date of Birth', value: dog.dob },
							{ label: 'Registration', value: dog.registrationNumber ?? '—' },
							{ label: 'Microchip', value: dog.microchipNumber ?? '—' },
						].map(({ label, value }) => (
							<div key={label}>
								<dt className="text-stone-400">{label}</dt>
								<dd className="text-stone-800 font-medium">{value}</dd>
							</div>
						))}
					</dl>
					{dog.notes && (
						<p className="mt-4 text-stone-600 text-sm leading-relaxed">{dog.notes}</p>
					)}
				</div>
			</div>

			{/* Health certs */}
			{dog.healthCerts?.length > 0 && (
				<section className="mb-12">
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">Health Certifications</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{dog.healthCerts.map((cert) => (
							<div key={cert.id} className="bg-white border border-stone-200 rounded-lg p-4">
								<p className="text-sm font-medium text-stone-700">{certLabels[cert.type] ?? cert.type}</p>
								<div className="mt-1">
									<Badge variant={resultVariant[cert.result] ?? 'default'}>
										{cert.result}
									</Badge>
								</div>
								{cert.issuedAt && (
									<p className="text-xs text-stone-400 mt-2">{cert.issuedAt}</p>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			{/* Pedigree */}
			{pedigree && (
				<section>
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">Pedigree</h2>
					<div className="bg-stone-50 rounded-xl border border-stone-200 p-6 overflow-x-auto">
						<PedigreeNode dog={pedigree} depth={0} />
					</div>
				</section>
			)}

			{/* Image gallery */}
			{dog.imageUrls?.length > 1 && (
				<section className="mt-12">
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">Gallery</h2>
					<div className="grid grid-cols-3 md:grid-cols-4 gap-3">
						{dog.imageUrls.map((url, i) => (
							<div key={i} className="aspect-square rounded-lg overflow-hidden bg-stone-100">
								<img src={url} alt={`${dog.name} ${i + 1}`} className="w-full h-full object-cover" />
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
