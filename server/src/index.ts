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
import { authRoutes } from './routes/auth';

const app = new Elysia()
	.use(
		cors({
			origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
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

	.listen(process.env.PORT ?? 3000);

console.log(`🐾 Paw Registry API running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
