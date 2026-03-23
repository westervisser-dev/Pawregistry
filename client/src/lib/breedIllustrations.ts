/**
 * Breed illustration map — resolves a breed name to a public image path.
 *
 * Drop your final transparent-background PNGs into client/public/breeds/
 * and update the paths below. No other code changes are required.
 *
 * Current placeholders are inline SVG data URIs (no network dependency).
 */

/** Simple dog-silhouette SVG placeholder with a given fill colour. */
function dogSvg(fill: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
	  <ellipse cx="50" cy="68" rx="28" ry="20" fill="${fill}" opacity="0.9"/>
	  <circle cx="50" cy="38" r="18" fill="${fill}" opacity="0.9"/>
	  <ellipse cx="34" cy="24" rx="7" ry="11" fill="${fill}" opacity="0.9" transform="rotate(-15 34 24)"/>
	  <ellipse cx="66" cy="24" rx="7" ry="11" fill="${fill}" opacity="0.9" transform="rotate(15 66 24)"/>
	  <circle cx="44" cy="36" r="2.5" fill="white" opacity="0.7"/>
	  <circle cx="56" cy="36" r="2.5" fill="white" opacity="0.7"/>
	  <ellipse cx="50" cy="43" rx="5" ry="3.5" fill="${fill}" opacity="0.6"/>
	</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const BREED_ILLUSTRATIONS: Record<string, string> = {
	// Golden Doodle variants → replace with: /breeds/golden-doodle.png
	'Golden Doodle':     dogSvg('#c8922a'),
	'F1b Golden Doodle': dogSvg('#c8922a'),
	'F1 Golden Doodle':  dogSvg('#c8922a'),

	// Border Doodle → replace with: /breeds/border-doodle.png
	'Border Doodle':     dogSvg('#4a4a6a'),

	// Biewer Doodle → replace with: /breeds/biewer-doodle.png
	'Biewer Doodle':     dogSvg('#7a5c8a'),

	// Red Tuxedo Poodle → replace with: /breeds/red-tuxedo-poodle.png
	'Red Tuxedo Poodle': dogSvg('#b04030'),
};

/** Returns the illustration URL for a breed, or undefined if not mapped. */
export function getBreedIllustration(breed: string | null | undefined): string | undefined {
	if (!breed) return undefined;
	return BREED_ILLUSTRATIONS[breed];
}
