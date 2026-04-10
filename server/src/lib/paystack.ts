import { createHmac } from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// ─── Paystack IP whitelist (for additional hardening if desired) ──────────────
// Paystack's published webhook source IPs
export const PAYSTACK_IPS = [
	'52.31.139.75',
	'52.49.173.169',
	'52.214.14.220',
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InitTransactionParams {
	email: string;
	amountRands: number;
	reference: string;
	callbackUrl: string;
	metadata?: Record<string, unknown>;
}

export interface InitTransactionResult {
	authorizationUrl: string;
	accessCode: string;
	reference: string;
}

export interface PaystackTransactionData {
	id: number;
	status: string;         // 'success' | 'failed' | 'abandoned'
	reference: string;
	amount: number;         // in kobo/cents (rands * 100)
	currency: string;
	paidAt: string;
	metadata: Record<string, unknown>;
	customer: {
		email: string;
		first_name: string;
		last_name: string;
	};
}

// ─── Initialize a transaction ─────────────────────────────────────────────────

export async function initializeTransaction(
	params: InitTransactionParams,
): Promise<InitTransactionResult> {
	const body = {
		email: params.email,
		amount: Math.round(params.amountRands * 100), // Paystack uses cents
		reference: params.reference,
		callback_url: params.callbackUrl,
		currency: 'ZAR',
		metadata: params.metadata ?? {},
	};

	const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Paystack init failed: ${res.status} — ${text}`);
	}

	const json = await res.json() as {
		status: boolean;
		data: { authorization_url: string; access_code: string; reference: string };
	};

	if (!json.status) throw new Error('Paystack init returned status: false');

	return {
		authorizationUrl: json.data.authorization_url,
		accessCode: json.data.access_code,
		reference: json.data.reference,
	};
}

// ─── Verify transaction via API (secondary confirmation) ─────────────────────

export async function verifyTransaction(reference: string): Promise<PaystackTransactionData> {
	const res = await fetch(
		`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
		{
			headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
		},
	);

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Paystack verify failed: ${res.status} — ${text}`);
	}

	const json = await res.json() as {
		status: boolean;
		data: PaystackTransactionData;
	};

	if (!json.status) throw new Error('Paystack verify returned status: false');
	return json.data;
}

// ─── Verify webhook signature ─────────────────────────────────────────────────
// Paystack signs the raw body with HMAC-SHA512 using your secret key.
// Always verify before processing any webhook payload.

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
	if (!signature) return false;
	const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
		.update(rawBody)
		.digest('hex');
	return hash === signature;
}

// ─── Generate a unique payment reference ─────────────────────────────────────

export function generateReference(prefix: 'dep' | 'book' | 'fin'): string {
	const ts = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2, 7);
	return `paw_${prefix}_${ts}_${rand}`;
}
