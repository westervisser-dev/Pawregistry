import Elysia, { t } from 'elysia';
import { eq, and, sum, desc, ne, sql } from 'drizzle-orm';
import { db } from '../../db';
import { invoices, payments, clients, puppies, litters, appSettings, emailLogs } from '../../db/schema';
import { adminPlugin, clientPlugin } from '../../lib/auth';
import { Resend } from 'resend';
import { BREEDS, BREED_SIZES } from '@paw-registry/shared';

function formatBreed(breedCode: string | null | undefined): string | null {
	if (!breedCode) return null;
	const [breedVal, sizeVal] = breedCode.split(' - ');
	const breed = BREEDS.find((b) => b.value === breedVal);
	if (!breed) return breedCode;
	const size = sizeVal ? BREED_SIZES[breedVal]?.find((s) => s.value === sizeVal) : null;
	return size ? `${breed.label} (${size.label})` : breed.label;
}

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

function getResend(): Resend {
	return new Resend(process.env.RESEND_API_KEY ?? '');
}

async function nextInvoiceNumber(): Promise<string> {
	const year = new Date().getFullYear();
	const key = `invoice_counter_${year}`;

	// Atomic increment via raw SQL
	const rows = await db.execute<{ value: string }>(
		sql`INSERT INTO app_settings (key, value, updated_at)
		 VALUES (${key}, '1', NOW())
		 ON CONFLICT (key) DO UPDATE SET value = (app_settings.value::int + 1)::text, updated_at = NOW()
		 RETURNING value`,
	);

	const counter = Number((rows as unknown as Array<{ value: string }>)[0]?.value ?? 1);
	return `INV-${year}-${String(counter).padStart(4, '0')}`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const invoicesRoutes = new Elysia({ prefix: '/invoices' })

	// ── Public: view invoice by token ────────────────────────────────────────
	.get(
		'/view/:token',
		async ({ params, error }) => {
			const invoice = await db.query.invoices.findFirst({
				where: eq(invoices.viewToken, params.token),
			});
			if (!invoice) return error(404, { error: 'NotFound', message: 'Invoice not found' });

			// Mark as viewed on first access
			if (!invoice.viewedAt) {
				await db.update(invoices)
					.set({ viewedAt: new Date(), status: invoice.status === 'sent' ? 'viewed' : invoice.status, updatedAt: new Date() })
					.where(eq(invoices.id, invoice.id));
			}

			// Fetch linked payments
			const linkedPayments = await db.query.payments.findMany({
				where: eq(payments.invoiceId, invoice.id),
				orderBy: [desc(payments.createdAt)],
			});

			return { ...invoice, payments: linkedPayments };
		},
		{ params: t.Object({ token: t.String() }) },
	)

	// ── Client: get own invoices ─────────────────────────────────────────────
	.use(clientPlugin)
	.get('/mine', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user!.id),
		});
		if (!client) return error(404, { error: 'NotFound', message: 'Client not found' });

		return db.query.invoices.findMany({
			where: eq(invoices.clientId, client.id),
			orderBy: [desc(invoices.createdAt)],
		});
	})

	// ── Admin: list all invoices ─────────────────────────────────────────────
	.use(adminPlugin)
	.get(
		'/admin',
		async ({ query }) => {
			const conditions = [];
			if (query.clientId) conditions.push(eq(invoices.clientId, query.clientId));

			return db.query.invoices.findMany({
				where: conditions.length > 0 ? and(...conditions) : undefined,
				orderBy: [desc(invoices.createdAt)],
			});
		},
		{
			query: t.Object({
				clientId: t.Optional(t.String()),
			}),
		},
	)

	// ── Admin: create invoice ────────────────────────────────────────────────
	.post(
		'/admin',
		async ({ body, error }) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, body.clientId),
			});
			if (!client) return error(404, { error: 'NotFound', message: 'Client not found' });

			// Build line items
			let lineItems = body.lineItems ?? [];

			if (lineItems.length === 0 && body.puppyId) {
				// Auto-populate from puppy/litter
				const puppy = await db.query.puppies.findFirst({
					where: eq(puppies.id, body.puppyId),
					with: { litter: { columns: { shippingRands: true, name: true, breed: true } } },
				});

				if (puppy?.priceRands != null) {
					lineItems.push({
						description: `Puppy — ${puppy.collarColour} collar (${puppy.sex})${puppy.litter?.breed ? `, ${formatBreed(puppy.litter.breed)}` : ''}`,
						quantity: 1,
						unitPriceRands: puppy.priceRands,
						totalRands: puppy.priceRands,
					});

					if (puppy.litter?.shippingRands && puppy.litter.shippingRands > 0) {
						lineItems.push({
							description: 'Shipping',
							quantity: 1,
							unitPriceRands: puppy.litter.shippingRands,
							totalRands: puppy.litter.shippingRands,
						});
					}
				}
			}

			if (lineItems.length === 0) {
				return error(400, { error: 'NoLineItems', message: 'No line items provided and could not auto-populate from puppy' });
			}

			const subtotalRands = lineItems.reduce((sum, li) => sum + li.totalRands, 0);
			const totalRands = subtotalRands;

			// Calculate already paid
			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(
					eq(payments.clientId, body.clientId),
					eq(payments.status, 'complete'),
				));
			const paidRands = Number(paidResult[0]?.total ?? 0);

			const invoiceNumber = await nextInvoiceNumber();
			const viewToken = crypto.randomUUID();

			const [invoice] = await db.insert(invoices).values({
				invoiceNumber,
				clientId: body.clientId,
				puppyId: body.puppyId ?? null,
				lineItems,
				subtotalRands,
				totalRands,
				paidRands,
				breederName: process.env.APP_NAME ?? 'Paw Registry',
				breederEmail: process.env.ADMIN_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? '',
				clientName: `${client.firstName} ${client.lastName}`,
				clientEmail: client.email,
				clientPhone: client.phone ?? null,
				clientCity: client.city ?? null,
				viewToken,
				notes: body.notes ?? null,
				issuedAt: new Date(),
				dueDate: body.dueDate ? new Date(body.dueDate) : null,
			}).returning();

			return invoice;
		},
		{
			body: t.Object({
				clientId: t.String(),
				puppyId: t.Optional(t.String()),
				lineItems: t.Optional(t.Array(t.Object({
					description: t.String(),
					quantity: t.Number(),
					unitPriceRands: t.Number(),
					totalRands: t.Number(),
				}))),
				notes: t.Optional(t.String()),
				dueDate: t.Optional(t.String()),
			}),
		},
	)

	// ── Admin: update invoice ────────────────────────────────────────────────
	.patch(
		'/admin/:id',
		async ({ params, body, error }) => {
			const invoice = await db.query.invoices.findFirst({
				where: eq(invoices.id, params.id),
			});
			if (!invoice) return error(404, { error: 'NotFound', message: 'Invoice not found' });

			const updates: Record<string, unknown> = { updatedAt: new Date() };

			if (body.notes !== undefined) updates.notes = body.notes;
			if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
			if (body.status !== undefined) updates.status = body.status;

			// Line items can only be edited while draft
			if (body.lineItems !== undefined) {
				if (invoice.status !== 'draft') {
					return error(400, { error: 'Immutable', message: 'Line items can only be edited while invoice is in draft status' });
				}
				updates.lineItems = body.lineItems;
				updates.subtotalRands = body.lineItems.reduce((s: number, li: { totalRands: number }) => s + li.totalRands, 0);
				updates.totalRands = updates.subtotalRands;
			}

			const [updated] = await db.update(invoices)
				.set(updates)
				.where(eq(invoices.id, params.id))
				.returning();

			return updated;
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				notes: t.Optional(t.Union([t.String(), t.Null()])),
				dueDate: t.Optional(t.Union([t.String(), t.Null()])),
				status: t.Optional(t.String()),
				lineItems: t.Optional(t.Array(t.Object({
					description: t.String(),
					quantity: t.Number(),
					unitPriceRands: t.Number(),
					totalRands: t.Number(),
				}))),
			}),
		},
	)

	// ── Admin: send invoice to client ────────────────────────────────────────
	.post(
		'/admin/:id/send',
		async ({ params, error }) => {
			const invoice = await db.query.invoices.findFirst({
				where: eq(invoices.id, params.id),
			});
			if (!invoice) return error(404, { error: 'NotFound', message: 'Invoice not found' });

			const viewUrl = `${CLIENT_URL}/invoices/${invoice.viewToken}`;
			const balanceDue = Math.max(0, invoice.totalRands - invoice.paidRands);

			// Build line items HTML
			const lineItemsHtml = invoice.lineItems.map((li) =>
				`<tr><td style="padding:8px 12px;border-bottom:1px solid #f0ede8">${li.description}</td><td style="padding:8px 12px;border-bottom:1px solid #f0ede8;text-align:right">R${li.totalRands.toLocaleString()}</td></tr>`,
			).join('');

			const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#faf9f6">
<div style="max-width:600px;margin:0 auto;padding:24px">
	<div style="background:#292524;border-radius:12px 12px 0 0;padding:20px 24px">
		<p style="margin:0;color:#ffffff;font-size:17px;font-weight:700">🐾 ${invoice.breederName}</p>
	</div>
	<div style="background:#ffffff;border:1px solid #e8e5e0;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px">
		<h2 style="margin:0 0 4px;font-size:20px;color:#292524">Invoice ${invoice.invoiceNumber}</h2>
		<p style="margin:0 0 20px;font-size:13px;color:#78716c">Issued ${new Date(invoice.issuedAt ?? invoice.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

		<table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403c;margin-bottom:16px">
			<thead>
				<tr style="border-bottom:2px solid #292524">
					<th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#78716c">Description</th>
					<th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#78716c">Amount</th>
				</tr>
			</thead>
			<tbody>${lineItemsHtml}</tbody>
			<tfoot>
				<tr><td style="padding:8px 12px;font-weight:600">Total</td><td style="padding:8px 12px;text-align:right;font-weight:600">R${invoice.totalRands.toLocaleString()}</td></tr>
				<tr><td style="padding:8px 12px;color:#78716c">Paid</td><td style="padding:8px 12px;text-align:right;color:#4A6741">−R${invoice.paidRands.toLocaleString()}</td></tr>
				<tr style="border-top:2px solid #292524"><td style="padding:10px 12px;font-weight:700;font-size:16px">Balance Due</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;color:${balanceDue > 0 ? '#b91c1c' : '#4A6741'}">R${balanceDue.toLocaleString()}</td></tr>
			</tfoot>
		</table>

		${invoice.notes ? `<p style="margin:0 0 20px;padding:12px;background:#faf9f6;border-radius:8px;font-size:13px;color:#57534e">${invoice.notes}</p>` : ''}

		<div style="text-align:center;margin:24px 0">
			<a href="${viewUrl}" style="display:inline-block;padding:12px 28px;background:#292524;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View Invoice</a>
		</div>

		<p style="margin:16px 0 0;font-size:12px;color:#a8a29e;text-align:center">This is a transactional message from ${invoice.breederName}.</p>
	</div>
</div>
</body>
</html>`;

			const from = process.env.RESEND_FROM_EMAIL ?? 'Paw Registry <onboarding@resend.dev>';
			let resendId: string | null = null;
			let sendError: string | null = null;

			try {
				const { data, error: sendErr } = await getResend().emails.send({
					from,
					to: invoice.clientEmail,
					subject: `Invoice ${invoice.invoiceNumber} — ${invoice.breederName}`,
					html,
				});
				if (sendErr) sendError = sendErr.message;
				else resendId = data?.id ?? null;
			} catch (e) {
				sendError = e instanceof Error ? e.message : 'Unknown send error';
			}

			// Log the email
			await db.insert(emailLogs).values({
				clientId: invoice.clientId,
				trigger: 'invoice_sent',
				subject: `Invoice ${invoice.invoiceNumber}`,
				resendId,
				metadata: { error: sendError, invoiceId: invoice.id },
			});

			if (sendError) {
				return error(500, { error: 'SendFailed', message: `Failed to send: ${sendError}` });
			}

			// Update invoice status
			await db.update(invoices)
				.set({ sentAt: new Date(), status: 'sent', updatedAt: new Date() })
				.where(eq(invoices.id, invoice.id));

			return { success: true };
		},
		{ params: t.Object({ id: t.String() }) },
	)

	// ── Admin: link an existing payment to an invoice ────────────────────────
	.post(
		'/admin/:id/link-payment',
		async ({ params, body, error }) => {
			const invoice = await db.query.invoices.findFirst({
				where: eq(invoices.id, params.id),
			});
			if (!invoice) return error(404, { error: 'NotFound', message: 'Invoice not found' });

			const payment = await db.query.payments.findFirst({
				where: eq(payments.id, body.paymentId),
			});
			if (!payment) return error(404, { error: 'NotFound', message: 'Payment not found' });

			// Link payment to invoice
			await db.update(payments)
				.set({ invoiceId: invoice.id })
				.where(eq(payments.id, body.paymentId));

			// Recalculate paidRands
			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(
					eq(payments.invoiceId, invoice.id),
					eq(payments.status, 'complete'),
				));
			const newPaid = Number(paidResult[0]?.total ?? 0);
			const newStatus = newPaid >= invoice.totalRands ? 'paid' : invoice.status;

			await db.update(invoices)
				.set({ paidRands: newPaid, status: newStatus, updatedAt: new Date() })
				.where(eq(invoices.id, invoice.id));

			return { success: true, paidRands: newPaid };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ paymentId: t.String() }),
		},
	);
