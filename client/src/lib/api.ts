import { treaty } from '@elysiajs/eden';
import type { App } from '../../server/src/index';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = treaty<App>(API_URL, {
	fetch: {
		credentials: 'include',
	},
	headers() {
		const token = localStorage.getItem('access_token');
		return token ? { Authorization: `Bearer ${token}` } : {};
	},
});
