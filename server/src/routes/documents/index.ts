import Elysia from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { documents, clients } from '../../db/schema';
import { authPlugin } from '../../lib/auth';

export const documentsRoutes = new Elysia({ prefix: '/documents' })
	// ── Client: view own documents ──
	.use(authPlugin)
	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });
		return db.query.documents.findMany({ where: eq(documents.clientId, client.id) });
	});
