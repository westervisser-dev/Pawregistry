import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
	? sentryVitePlugin({
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT,
		authToken: process.env.SENTRY_AUTH_TOKEN,
	  })
	: null;

export default defineConfig({
	plugins: [react(), tailwindcss(), ...(sentryPlugin ? [sentryPlugin] : [])],
	build: {
		// Generate source maps for Sentry upload (hidden = not served to browser)
		sourcemap: 'hidden',
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@paw-registry/shared': resolve(__dirname, '../shared/src/index.ts'),
		},
	},
	server: {
		port: 5173,
	},
});