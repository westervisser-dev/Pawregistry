import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { InvoiceWithPayments, Payment } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';

function StatusBadge({ status }: { status: string }) {
	const cls =
		status === 'complete' ? 'bg-green-100 text-green-700' :
		status === 'pending' ? 'bg-amber-100 text-amber-700' :
		status === 'failed' ? 'bg-red-100 text-red-700' :
		'bg-warm-100 text-warm-500';
	const label = status === 'complete' ? 'Paid' : status.charAt(0).toUpperCase() + status.slice(1);
	return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function paymentTypeLabel(p: Payment): string {
	const meta = p.metadata as Record<string, unknown>;
	if (meta?.isInstalment) return `Instalment ${Number(meta.instalmentIndex) + 1} of ${meta.instalmentTotal}`;
	return p.type === 'deposit' ? 'Deposit' : p.type === 'booking' ? 'Booking' : 'Final';
}

export function InvoiceView() {
	const { token } = useParams<{ token: string }>();
	const [invoice, setInvoice] = useState<InvoiceWithPayments | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	usePageTitle('Invoice');

	useEffect(() => {
		if (!token) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.invoices as any).view({ token }).get().then(({ data, error: err }: { data: InvoiceWithPayments | null; error: unknown }) => {
			if (data) setInvoice(data);
			else setError('Invoice not found');
			setLoading(false);
		}).catch(() => {
			setError('Failed to load invoice');
			setLoading(false);
		});
	}, [token]);

	if (loading) {
		return (
			<div className="min-h-screen bg-warm-50 flex items-center justify-center">
				<p className="text-warm-400 text-sm">Loading invoice...</p>
			</div>
		);
	}

	if (error || !invoice) {
		return (
			<div className="min-h-screen bg-warm-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-warm-500 text-lg mb-2">{error || 'Invoice not found'}</p>
					<p className="text-warm-400 text-sm">This invoice link may be invalid or expired.</p>
				</div>
			</div>
		);
	}

	const balanceDue = Math.max(0, invoice.totalRands - invoice.paidRands);
	const pendingPayments = invoice.payments.filter((p) => p.status === 'pending');
	const completedPayments = invoice.payments.filter((p) => p.status === 'complete');

	return (
		<div className="min-h-screen bg-warm-50 print:bg-white">
			{/* Print button */}
			<div className="print:hidden fixed top-4 right-4 z-10">
				<button
					onClick={() => window.print()}
					className="px-4 py-2 bg-warm-800 text-white text-sm font-medium rounded-lg hover:bg-warm-900 transition-colors shadow-md"
				>
					Download PDF
				</button>
			</div>

			<div className="max-w-[800px] mx-auto p-6 md:p-10 print:p-0">
				<div className="bg-white rounded-xl shadow-sm border border-black/[0.06] overflow-hidden print:shadow-none print:border-none print:rounded-none">

					{/* Header */}
					<div className="p-8 pb-6 border-b border-black/[0.06]">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-xl font-bold text-warm-900">{invoice.breederName}</p>
								<p className="text-sm text-warm-500 mt-1">{invoice.breederEmail}</p>
							</div>
							<div className="text-right">
								<h1 className="text-2xl font-serif font-bold text-warm-900">INVOICE</h1>
								<p className="text-sm font-medium text-warm-600 mt-1">{invoice.invoiceNumber}</p>
								<p className="text-xs text-warm-400 mt-0.5">
									{new Date(invoice.issuedAt ?? invoice.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
								</p>
								{invoice.dueDate && (
									<p className="text-xs text-warm-400 mt-0.5">
										Due: {new Date(invoice.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Bill To */}
					<div className="px-8 py-5 bg-warm-50/50 border-b border-black/[0.06]">
						<p className="text-[10px] uppercase tracking-[0.06em] text-warm-400 mb-1">Bill To</p>
						<p className="font-medium text-warm-900">{invoice.clientName}</p>
						<p className="text-sm text-warm-500">{invoice.clientEmail}</p>
						{invoice.clientPhone && <p className="text-sm text-warm-500">{invoice.clientPhone}</p>}
						{invoice.clientCity && <p className="text-sm text-warm-500">{invoice.clientCity}</p>}
					</div>

					{/* Line Items */}
					<div className="px-8 py-6">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b-2 border-warm-800">
									<th className="text-left py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium">Description</th>
									<th className="text-center py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium w-16">Qty</th>
									<th className="text-right py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium w-28">Unit Price</th>
									<th className="text-right py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium w-28">Total</th>
								</tr>
							</thead>
							<tbody>
								{invoice.lineItems.map((li, i) => (
									<tr key={i} className="border-b border-warm-100">
										<td className="py-3 text-warm-700">{li.description}</td>
										<td className="py-3 text-center text-warm-500">{li.quantity}</td>
										<td className="py-3 text-right text-warm-500 tabular-nums">R{li.unitPriceRands.toLocaleString()}</td>
										<td className="py-3 text-right text-warm-700 font-medium tabular-nums">R{li.totalRands.toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>

						{/* Totals */}
						<div className="mt-4 flex justify-end">
							<div className="w-64">
								<div className="flex justify-between py-2 text-sm">
									<span className="text-warm-500">Subtotal</span>
									<span className="text-warm-700 tabular-nums">R{invoice.subtotalRands.toLocaleString()}</span>
								</div>
								<div className="flex justify-between py-2 text-sm border-b border-warm-100">
									<span className="text-warm-500">Total</span>
									<span className="font-medium text-warm-900 tabular-nums">R{invoice.totalRands.toLocaleString()}</span>
								</div>
								{invoice.paidRands > 0 && (
									<div className="flex justify-between py-2 text-sm">
										<span className="text-green-600">Paid</span>
										<span className="text-green-600 tabular-nums">-R{invoice.paidRands.toLocaleString()}</span>
									</div>
								)}
								<div className="flex justify-between py-3 text-base border-t-2 border-warm-800">
									<span className="font-bold text-warm-900">Balance Due</span>
									<span className={`font-bold tabular-nums ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
										R{balanceDue.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Pending Payments — Pay Now links */}
					{pendingPayments.length > 0 && (
						<div className="px-8 py-5 border-t border-black/[0.06] print:hidden">
							<p className="text-xs uppercase tracking-[0.06em] text-warm-400 font-medium mb-3">Awaiting Payment</p>
							<div className="space-y-2">
								{pendingPayments.map((p) => (
									<div key={p.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
										<div>
											<span className="text-sm font-medium text-warm-700">{paymentTypeLabel(p)}</span>
											<span className="text-sm text-warm-500 ml-2">R{p.amountRands.toLocaleString()}</span>
										</div>
										{p.authorizationUrl && (
											<a
												href={p.authorizationUrl}
												className="px-4 py-1.5 bg-warm-800 text-white text-xs font-medium rounded-lg hover:bg-warm-900 transition-colors"
											>
												Pay Now
											</a>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Payment History */}
					{completedPayments.length > 0 && (
						<div className="px-8 py-5 border-t border-black/[0.06]">
							<p className="text-xs uppercase tracking-[0.06em] text-warm-400 font-medium mb-3">Payment History</p>
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-warm-100">
										<th className="text-left py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium">Date</th>
										<th className="text-left py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium">Type</th>
										<th className="text-right py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium">Amount</th>
										<th className="text-right py-2 text-[10px] uppercase tracking-[0.06em] text-warm-400 font-medium">Status</th>
									</tr>
								</thead>
								<tbody>
									{completedPayments.map((p) => (
										<tr key={p.id} className="border-b border-warm-50">
											<td className="py-2 text-warm-500">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
											<td className="py-2 text-warm-600">{paymentTypeLabel(p)}</td>
											<td className="py-2 text-right text-warm-700 tabular-nums font-medium">R{p.amountRands.toLocaleString()}</td>
											<td className="py-2 text-right"><StatusBadge status={p.status} /></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Notes */}
					{invoice.notes && (
						<div className="px-8 py-5 border-t border-black/[0.06] bg-warm-50/50">
							<p className="text-xs uppercase tracking-[0.06em] text-warm-400 font-medium mb-2">Notes</p>
							<p className="text-sm text-warm-600 whitespace-pre-wrap">{invoice.notes}</p>
						</div>
					)}

					{/* Footer */}
					<div className="px-8 py-5 border-t border-black/[0.06] text-center">
						<p className="text-sm text-warm-400">Thank you for your business</p>
					</div>
				</div>
			</div>

			{/* Print styles */}
			<style>{`
				@media print {
					@page { margin: 1cm; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
			`}</style>
		</div>
	);
}

export default InvoiceView;
