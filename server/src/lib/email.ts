import { Resend } from 'resend';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { emailTemplates, emailLogs, clients, litters, updates, litterInterests, litterNotifications, litterUpdateOptOuts, puppies, appSettings } from '../db/schema';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

let _resend: Resend | null = null;
function getResend(): Resend {
	if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? '');
	return _resend;
}

// Maps client stage values to email trigger identifiers
const STAGE_TRIGGER: Partial<Record<string, string>> = {
	enquired: 'stage_enquired',
	approved: 'stage_approved',
	waitlisted: 'stage_waitlisted',
	puppy_reserved: 'stage_puppy_reserved',
	puppy_booked: 'stage_puppy_booked',
	puppy_fully_paid: 'stage_puppy_fully_paid',
};

function interpolate(text: string, vars: Record<string, string>): string {
	return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function toHtml(plainText: string): string {
	const escaped = plainText
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	const lines = escaped.split('\n').map(line => {
		const linked = line.replace(
			/(https?:\/\/[^\s]+)/g,
			'<a href="$1" style="color:#92400e;text-decoration:underline">$1</a>',
		);
		return linked
			? `<p style="margin:0 0 14px 0;color:#1c1917;font-size:15px;line-height:1.65">${linked}</p>`
			: '<p style="margin:0 0 8px 0">&nbsp;</p>';
	});

	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f4;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="background:#1c1917;border-radius:12px 12px 0 0;padding:24px 32px">
          <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.02em">🐾 ${process.env.APP_NAME ?? 'Paw Registry'}</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e7e5e4;border-right:1px solid #e7e5e4">
          ${lines.join('\n          ')}
        </td></tr>
        <tr><td style="background:#f5f5f4;border-radius:0 0 12px 12px;padding:18px 32px;border:1px solid #e7e5e4;border-top:none">
          <p style="margin:0;font-size:12px;color:#a8a29e">This is a transactional message related to your application with ${process.env.APP_NAME ?? 'Paw Registry'}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared send logic ────────────────────────────────────────────────────────

async function sendEmailByTrigger(clientId: string, trigger: string): Promise<void> {
	const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
	if (!client) return;

	const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.trigger, trigger));
	if (!template?.enabled) return;

	const vars: Record<string, string> = {
		first_name: client.firstName,
		full_name: `${client.firstName} ${client.lastName}`,
		portal_link: `${process.env.CLIENT_URL}/portal`,
		documents_link: `${process.env.CLIENT_URL}/portal/documents`,
	};

	if (client.litterId) {
		const [litter] = await db.select().from(litters).where(eq(litters.id, client.litterId));
		if (litter) {
			vars.litter_name = litter.name;
			vars.litter_breed = litter.breed ?? 'TBC';
			vars.litter_expected_date = litter.expectedDate ?? litter.whelpDate ?? 'TBC';
			vars.litter_link = `${process.env.CLIENT_URL}/portal/litters/${litter.id}`;
		}
	}

	const subject = interpolate(template.subject, vars);
	const body = interpolate(template.body, vars);
	const html = toHtml(body);

	let resendId: string | null = null;
	let sendError: string | null = null;

	try {
		const from = process.env.RESEND_FROM_EMAIL ?? 'Paw Registry <onboarding@resend.dev>';
		const { data, error } = await getResend().emails.send({ from, to: client.email, subject, html });
		if (error) sendError = error.message;
		else resendId = data?.id ?? null;
	} catch (e) {
		sendError = e instanceof Error ? e.message : 'Unknown send error';
	}

	await db.insert(emailLogs).values({
		clientId: client.id,
		trigger,
		subject,
		resendId,
		metadata: { error: sendError },
	});
}

// ─── Public: send a stage-mapped email to a client ───────────────────────────

export async function sendStageEmail(clientId: string, stage: string): Promise<void> {
	const trigger = STAGE_TRIGGER[stage];
	if (!trigger) return;
	await sendEmailByTrigger(clientId, trigger);
}

// ─── Public: send any template-based email to a client by trigger key ────────

export async function sendClientEmail(clientId: string, trigger: string): Promise<void> {
	await sendEmailByTrigger(clientId, trigger);
}

// ─── Public: send template email with extra interpolation vars ───────────────

export async function sendClientEmailWithVars(
	clientId: string,
	trigger: string,
	extraVars: Record<string, string>,
): Promise<void> {
	const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
	if (!client) return;

	const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.trigger, trigger));
	if (!template?.enabled) return;

	const vars: Record<string, string> = {
		first_name: client.firstName,
		full_name: `${client.firstName} ${client.lastName}`,
		portal_link: `${process.env.CLIENT_URL}/portal`,
		payments_link: `${process.env.CLIENT_URL}/portal/payments`,
		...extraVars,
	};

	const subject = interpolate(template.subject, vars);
	const body = interpolate(template.body, vars);
	const html = toHtml(body);

	let resendId: string | null = null;
	let sendError: string | null = null;

	try {
		const from = process.env.RESEND_FROM_EMAIL ?? 'Paw Registry <onboarding@resend.dev>';
		const { data, error } = await getResend().emails.send({ from, to: client.email, subject, html });
		if (error) sendError = error.message;
		else resendId = data?.id ?? null;
	} catch (e) {
		sendError = e instanceof Error ? e.message : 'Unknown send error';
	}

	await db.insert(emailLogs).values({
		clientId: client.id,
		trigger,
		subject,
		resendId,
		metadata: { error: sendError, extraVars },
	});
}

// ─── Public: notify a client they've been selected for a litter ──────────────

export async function sendLitterNotificationEmail(clientId: string, litterId: string): Promise<void> {
	const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
	if (!client) return;

	const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.trigger, 'litter_notified'));
	if (!template?.enabled) return;

	const [litter] = await db.select().from(litters).where(eq(litters.id, litterId));

	const vars: Record<string, string> = {
		first_name: client.firstName,
		full_name: `${client.firstName} ${client.lastName}`,
		portal_link: `${process.env.CLIENT_URL}/portal`,
		litter_name: litter?.name ?? 'our new litter',
		litter_breed: litter?.breed ?? 'TBC',
		litter_expected_date: litter?.expectedDate ?? litter?.whelpDate ?? 'TBC',
		litter_link: `${process.env.CLIENT_URL}/portal/litters/${litterId}`,
	};

	const subject = interpolate(template.subject, vars);
	const body = interpolate(template.body, vars);
	const html = toHtml(body);

	let resendId: string | null = null;
	let sendError: string | null = null;

	try {
		const from = process.env.RESEND_FROM_EMAIL ?? 'Paw Registry <onboarding@resend.dev>';
		const { data, error } = await getResend().emails.send({ from, to: client.email, subject, html });
		if (error) sendError = error.message;
		else resendId = data?.id ?? null;
	} catch (e) {
		sendError = e instanceof Error ? e.message : 'Unknown send error';
	}

	await db.insert(emailLogs).values({
		clientId: client.id,
		trigger: 'litter_notified',
		subject,
		resendId,
		metadata: { error: sendError, litterId },
	});
}

// ─── Public: send litter update emails to all subscribed clients ─────────────

export async function sendLitterUpdateEmails(params: {
	updateId: string;
	litterId: string;
	litterName: string;
	title: string;
	body: string;
	weekNumber: number | null;
}): Promise<number> {
	// Collect client IDs from all 4 association sources in parallel
	const [interestRows, notifRows] = await Promise.all([
		db.select({ clientId: litterInterests.clientId })
			.from(litterInterests)
			.where(eq(litterInterests.litterId, params.litterId)),
		db.select({ clientId: litterNotifications.clientId })
			.from(litterNotifications)
			.where(eq(litterNotifications.litterId, params.litterId)),
	]);

	// Direct client.litterId associations
	const directClients = await db.select({ id: clients.id })
		.from(clients)
		.where(eq(clients.litterId, params.litterId));

	// Clients matched to a puppy in this litter
	const puppyRows = await db.select({ id: clients.id })
		.from(clients)
		.innerJoin(puppies, eq(clients.puppyId, puppies.id))
		.where(eq(puppies.litterId, params.litterId));

	const allClientIds = new Set([
		...interestRows.map((r) => r.clientId),
		...notifRows.map((r) => r.clientId),
		...directClients.map((r) => r.id),
		...puppyRows.map((r) => r.id),
	]);

	if (allClientIds.size === 0) return 0;

	// Filter out opted-out clients
	const optOuts = await db.select({ clientId: litterUpdateOptOuts.clientId })
		.from(litterUpdateOptOuts)
		.where(eq(litterUpdateOptOuts.litterId, params.litterId));
	const optOutSet = new Set(optOuts.map((r) => r.clientId));

	const targetIds = [...allClientIds].filter((id) => !optOutSet.has(id));
	if (targetIds.length === 0) return 0;

	// Fetch client contact details
	const targetClients = await db
		.select({ id: clients.id, email: clients.email, firstName: clients.firstName })
		.from(clients)
		.where(inArray(clients.id, targetIds));

	const from = process.env.RESEND_FROM_EMAIL ?? 'Paw Registry <onboarding@resend.dev>';
	const portalLink = `${process.env.CLIENT_URL}/portal/updates`;
	const weekPrefix = params.weekNumber ? `Week ${params.weekNumber} · ` : '';
	const subject = `${weekPrefix}${params.title} — ${params.litterName}`;

	let sentCount = 0;

	for (const client of targetClients) {
		const html = buildUpdateEmailHtml({
			firstName: client.firstName,
			litterName: params.litterName,
			title: params.title,
			body: params.body,
			weekNumber: params.weekNumber,
			portalLink,
		});

		let resendId: string | null = null;
		let sendError: string | null = null;

		try {
			const { data, error } = await getResend().emails.send({ from, to: client.email, subject, html });
			if (error) sendError = error.message;
			else { resendId = data?.id ?? null; sentCount++; }
		} catch (e) {
			sendError = e instanceof Error ? e.message : 'Unknown error';
		}

		await db.insert(emailLogs).values({
			clientId: client.id,
			trigger: 'litter_update',
			subject,
			resendId,
			metadata: { updateId: params.updateId, litterId: params.litterId, error: sendError },
		});
	}

	// Mark update as emailed
	await db.update(updates).set({ emailSentAt: new Date() }).where(eq(updates.id, params.updateId));

	return sentCount;
}

function buildUpdateEmailHtml(params: {
	firstName: string;
	litterName: string;
	title: string;
	body: string;
	weekNumber: number | null;
	portalLink: string;
}): string {
	const weekBadge = params.weekNumber
		? `<p style="margin:0 0 12px 0;display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;padding:3px 10px;border-radius:9999px">Week ${params.weekNumber}</p>`
		: '';

	const bodyHtml = params.body
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.split('\n')
		.map((line) => line
			? `<p style="margin:0 0 14px 0;color:#1c1917;font-size:15px;line-height:1.65">${line}</p>`
			: '<p style="margin:0 0 8px 0">&nbsp;</p>',
		)
		.join('\n');

	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f4;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="background:#1c1917;border-radius:12px 12px 0 0;padding:24px 32px">
          <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.02em">🐾 ${process.env.APP_NAME ?? 'Paw Registry'}</p>
          <p style="margin:4px 0 0 0;color:#a8a29e;font-size:13px">${params.litterName}</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e7e5e4;border-right:1px solid #e7e5e4">
          <p style="margin:0 0 4px 0;color:#a8a29e;font-size:13px">Hi ${params.firstName},</p>
          ${weekBadge}
          <h1 style="margin:0 0 16px 0;color:#1c1917;font-size:20px;font-weight:700;line-height:1.3">${params.title}</h1>
          ${bodyHtml}
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px">
            <tr><td style="background:#1c1917;border-radius:8px;padding:12px 24px">
              <a href="${params.portalLink}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">View in portal →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f5f5f4;border-radius:0 0 12px 12px;padding:18px 32px;border:1px solid #e7e5e4;border-top:none">
          <p style="margin:0;font-size:12px;color:#a8a29e">You're receiving this because you're registered with ${process.env.APP_NAME ?? 'Paw Registry'}. <a href="${params.portalLink}" style="color:#a8a29e">Manage notifications in your portal.</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public: send a plain notification email to the admin ────────────────────

export async function sendAdminNotification(subject: string, body: string): Promise<void> {
	try {
		const from = process.env.RESEND_FROM_EMAIL ?? 'Paw Registry <onboarding@resend.dev>';

		const [recipientsSetting] = await db.select().from(appSettings).where(eq(appSettings.key, 'admin_notification_recipients'));
		let to: string | string[] | null = null;

		if (recipientsSetting?.value) {
			try {
				const parsed = JSON.parse(recipientsSetting.value) as Array<{ email: string; enabled: boolean }>;
				const enabled = parsed.filter((r) => r.enabled).map((r) => r.email);
				if (enabled.length > 0) to = enabled;
			} catch {
				// fall through to legacy
			}
		}

		if (!to) {
			const [legacySetting] = await db.select().from(appSettings).where(eq(appSettings.key, 'admin_email'));
			const legacy = legacySetting?.value || ADMIN_EMAIL;
			if (legacy) to = legacy;
		}

		if (!to) return;
		await getResend().emails.send({ from, to, subject, html: toHtml(body) });
	} catch (e) {
		console.error('Admin notification failed:', e);
	}
}
