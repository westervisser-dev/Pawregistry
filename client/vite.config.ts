import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react(), tailwindcss()],
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