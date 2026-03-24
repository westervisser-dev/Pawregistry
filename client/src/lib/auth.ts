// Shared admin email list — client-side hint only; real gate is server-side
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
	.split(',')
	.map((s: string) => s.trim())
	.filter(Boolean);
