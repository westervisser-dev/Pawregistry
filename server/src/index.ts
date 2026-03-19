import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { dogsRoutes } from './routes/dogs';
import { littersRoutes } from './routes/litters';
import { clientsRoutes } from './routes/clients';
import { updatesRoutes } from './routes/updates';
import { messagesRoutes } from './routes/messages';
import { documentsRoutes } from './routes/documents';
import { checklistRoutes } from './routes/documents/checklists';
import { templatesRoutes } from './routes/templates';
import { authRoutes } from './routes/auth';

const app = new Elysia()
	.use(
		cors({
			origin: (req) => {
				const origin = req.headers.get('origin') ?? '';
				return /^http:\/\/localhost:\d+$/.test(origin) || origin === process.env.CLIENT_URL;
			},
			credentials: true,
		})
	)
	.use(
		swagger({
			documentation: {
				info: { title: 'Paw Registry API', version: '1.0.0' },
			},
		})
	)

	// Health check — used by Railway
	.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

	// Routes
	.use(authRoutes)
	.use(dogsRoutes)
	.use(littersRoutes)
	.use(clientsRoutes)
	.use(updatesRoutes)
	.use(messagesRoutes)
	.use(documentsRoutes)
	.use(checklistRoutes)
	.use(templatesRoutes)

	.listen(process.env.PORT ?? 3000);

console.log(`🐾 Paw Registry API running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
