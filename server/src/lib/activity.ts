import { db } from '../db';
import { clientActivity } from '../db/schema';

type ActivityType =
	| 'application_submitted'
	| 'stage_changed'
	| 'deposit_changed'
	| 'preferences_updated'
	| 'notes_updated'
	| 'document_uploaded'
	| 'document_signed'
	| 'deposit_paid'
	| 'booking_payment_received'
	| 'booking_expired'
	| 'final_payment_received'
	| 'payment_marked_paid';

type Actor = 'client' | 'admin' | 'system';

export function logActivity(
	clientId: string,
	type: ActivityType,
	description: string,
	actor: Actor = 'system',
	metadata: Record<string, unknown> = {},
): void {
	// Fire-and-forget — never block the request
	db.insert(clientActivity)
		.values({ clientId, type, description, actor, metadata })
		.catch(console.error);
}
