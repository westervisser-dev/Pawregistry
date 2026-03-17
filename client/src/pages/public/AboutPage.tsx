export function AboutPage() {
	return (
		<div className="max-w-3xl mx-auto px-6 py-20">
			<h1 className="font-serif text-4xl font-bold text-stone-900 mb-6">About Us</h1>
			<div className="prose prose-stone max-w-none">
				<p className="text-stone-600 leading-relaxed text-lg mb-6">
					We are a small, family-run breeding programme with a passion for producing
					healthy, well-tempered dogs that enrich the lives of the families they join.
				</p>
				<p className="text-stone-600 leading-relaxed mb-6">
					Every dog in our programme is health-tested, registered with the relevant
					kennel club, and raised in our home with early neurological stimulation
					and socialisation protocols.
				</p>
				<p className="text-stone-600 leading-relaxed">
					We place puppies with careful consideration — our waitlist exists because
					we believe every puppy deserves the right home, not just the next available one.
				</p>
			</div>
		</div>
	);
}
