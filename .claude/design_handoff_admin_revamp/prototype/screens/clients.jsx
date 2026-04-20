// ─── Clients list + Client Detail ────────────────────────────────────────────

function ClientsScreen({ onOpenClient }) {
  const D = window.PAW_DATA;
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const filters = [
    { value: 'all',              label: 'All',          count: D.clients.length },
    { value: 'enquired',         label: 'New',          count: D.clients.filter(c => c.stage === 'enquired').length },
    { value: 'approved',         label: 'Approved',     count: D.clients.filter(c => c.stage === 'approved').length },
    { value: 'waitlisted',       label: 'Waitlisted',   count: D.clients.filter(c => c.stage === 'waitlisted').length },
    { value: 'reserved',         label: 'Reserved',     count: D.clients.filter(c => c.stage === 'puppy_reserved' || c.stage === 'puppy_booked').length },
    { value: 'puppy_fully_paid', label: 'Completed',    count: D.clients.filter(c => c.stage === 'puppy_fully_paid').length },
  ];

  const list = D.clients.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'reserved') return c.stage === 'puppy_reserved' || c.stage === 'puppy_booked';
    return c.stage === filter;
  }).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.firstName + ' ' + c.lastName + ' ' + c.email + ' ' + c.city).toLowerCase().includes(q);
  });

  return (
    <div className="p-6 md:p-8 max-w-[1440px]">
      <PageHeader
        title="Clients"
        subtitle="All enquiries, applicants, and placed families."
        action={<div className="flex gap-2">
          <Button variant="secondary" icon={<Glyph shape="doc" color="#7a6a58" size={14}/>}>Export CSV</Button>
          <Button icon={<Glyph shape="plus" color="#fff" size={14}/>}>Add client</Button>
        </div>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented
          options={filters}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-2 bg-white border border-warm-200 rounded-[9px] h-9 px-3 w-full sm:w-[300px]">
          <Glyph shape="search" color="#9a8871" size={14} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email or city"
            className="bg-transparent outline-none text-[13px] text-warm-800 placeholder-warm-400 w-full"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Client','Stage','Deposit','City','Applied','Priority',''].map(h => (
                  <th key={h} className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400 font-medium px-[18px] py-3 text-left border-b border-black/[0.06] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} onClick={() => onOpenClient(c.id)}
                    className="cursor-pointer border-b border-black/[0.04] last:border-0 hover:bg-warm-50 transition-colors">
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.firstName + ' ' + c.lastName} size={34} />
                      <div>
                        <div className="text-[13.5px] font-medium text-warm-900">{c.firstName} {c.lastName}</div>
                        <div className="text-[11.5px] text-warm-500">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-[18px] py-3"><StagePill stage={c.stage} size="sm" /></td>
                  <td className="px-[18px] py-3"><DepositPill status={c.depositStatus} tier={c.depositTier} /></td>
                  <td className="px-[18px] py-3 text-[12.5px] text-warm-700">{c.city}</td>
                  <td className="px-[18px] py-3 text-[12.5px] text-warm-500 tabular-nums whitespace-nowrap">{D.shortDate(c.appliedAt)}</td>
                  <td className="px-[18px] py-3">
                    {c.stage === 'waitlisted' || c.stage === 'puppy_reserved' || c.stage === 'puppy_booked' ? (
                      <span className="inline-block text-[11.5px] font-mono text-warm-600 bg-warm-100 rounded px-2 py-1 tabular-nums">#{String(c.priority).padStart(2,'0')}</span>
                    ) : <span className="text-warm-300">—</span>}
                  </td>
                  <td className="px-[18px] py-3 text-right">
                    <span className="text-[12px] text-[#c47420] font-medium">Open →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Client Detail — stage progression + payments ─────────────────────────────

function ClientDetailScreen({ clientId, onBack, onNavigate }) {
  const D = window.PAW_DATA;
  const client = D.clients.find(c => c.id === clientId);
  const [stage, setStage] = React.useState(client.stage);
  const [tab, setTab] = React.useState('overview');

  if (!client) return null;

  const litter = client.litterId ? D.litters.find(l => l.id === client.litterId) : null;
  const puppy = client.puppyId ? D.puppies.find(p => p.id === client.puppyId) : null;
  const clientPayments = D.payments.filter(p => p.clientId === client.id).sort((a,b) => new Date(b.paidAt || b.dueDate || 0) - new Date(a.paidAt || a.dueDate || 0));
  const activity = D.activityByClient[client.id] || [
    { when: client.updatedAt + ' 12:00', actor: 'system', text: `Stage: ${D.stageLabel[client.stage]}` },
    { when: client.appliedAt + ' 10:15', actor: 'client', text: 'Submitted application' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1440px]">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-warm-500 hover:text-warm-800 mb-4">
        <span>←</span> All clients
      </button>

      <div className="flex flex-wrap items-start justify-between gap-5 mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={client.firstName + ' ' + client.lastName} size={64} />
          <div>
            <h1 className="font-serif text-[30px] text-warm-900 leading-tight">{client.firstName} {client.lastName}</h1>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-warm-600 mt-1">
              <span>{client.email}</span>
              <span className="text-warm-300">·</span>
              <span>{client.city}</span>
              <span className="text-warm-300">·</span>
              <span>Applied {D.formatDate(client.appliedAt)}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <StagePill stage={stage} />
              <DepositPill status={client.depositStatus} tier={client.depositTier} />
              {(client.stage === 'waitlisted' || client.stage === 'puppy_reserved' || client.stage === 'puppy_booked') && (
                <span className="inline-block text-[11px] font-mono text-warm-600 bg-warm-100 rounded px-2 py-1 tabular-nums">Waitlist #{String(client.priority).padStart(2,'0')}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Message</Button>
          <Button variant="secondary">Edit</Button>
          <Button>Advance stage</Button>
        </div>
      </div>

      {/* Stage progression tracker — the hero interaction */}
      <Card className="mb-5">
        <div className="px-[22px] py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-medium text-warm-900">Journey</h3>
              <p className="text-[12px] text-warm-500 mt-0.5">Click a stage to advance. System-set stages are locked.</p>
            </div>
            <span className="text-[11.5px] text-warm-500">Since {D.formatDate(client.appliedAt)} · {Math.round((new Date('2026-04-21') - new Date(client.appliedAt))/(86400000))} days</span>
          </div>
          <StageTracker current={stage} onChange={setStage} puppy={puppy} litter={litter} />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-warm-200 mb-5">
        {[
          { value: 'overview',    label: 'Overview' },
          { value: 'payments',    label: 'Payments', count: clientPayments.length },
          { value: 'application', label: 'Application' },
          { value: 'documents',   label: 'Documents' },
          { value: 'activity',    label: 'Activity', count: activity.length },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
                  className={`px-3.5 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${tab === t.value ? 'border-[#c47420] text-warm-900' : 'border-transparent text-warm-500 hover:text-warm-800'}`}>
            {t.label}{typeof t.count === 'number' && <span className="ml-1.5 text-warm-400">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab client={client} litter={litter} puppy={puppy} />}
      {tab === 'payments' && <PaymentsTab payments={clientPayments} client={client} />}
      {tab === 'application' && <ApplicationTab client={client} />}
      {tab === 'documents' && <DocumentsTab />}
      {tab === 'activity' && <ActivityTab activity={activity} />}
    </div>
  );
}

function StageTracker({ current, onChange, puppy, litter }) {
  const D = window.PAW_DATA;
  const stages = [
    { key: 'enquired',         label: 'Enquired',     caption: 'Application received' },
    { key: 'approved',         label: 'Approved',     caption: 'Admin reviewed' },
    { key: 'waitlisted',       label: 'Waitlisted',   caption: 'Documents signed' },
    { key: 'puppy_reserved',   label: 'Reserved',     caption: 'Puppy chosen' },
    { key: 'puppy_booked',     label: 'Booked',       caption: 'Booking paid' },
    { key: 'puppy_fully_paid', label: 'Fully paid',   caption: 'Final balance' },
  ];
  const currentIdx = stages.findIndex(s => s.key === current);

  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-[13px] h-[2px] bg-warm-200 rounded-full" />
      <div
        className="absolute left-0 top-[13px] h-[2px] rounded-full transition-all duration-500"
        style={{ width: `${(currentIdx / (stages.length - 1)) * 100}%`, background: '#c47420' }}
      />
      <div className="relative grid grid-cols-6 gap-2">
        {stages.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <button key={s.key} onClick={() => onChange(s.key)}
                    className="flex flex-col items-start text-left">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all mb-2"
                style={{
                  background: done || active ? '#c47420' : '#fff',
                  borderColor: done || active ? '#c47420' : '#d6c9b8',
                  color: '#fff',
                  boxShadow: active ? '0 0 0 4px rgba(196,116,32,0.18)' : 'none',
                }}
              >
                {done ? <Glyph shape="check" color="#fff" size={14}/> : active ? <span className="w-2 h-2 rounded-full bg-white" /> : null}
              </span>
              <span className={`text-[12.5px] font-medium ${active || done ? 'text-warm-900' : 'text-warm-500'}`}>{s.label}</span>
              <span className="text-[10.5px] text-warm-400 mt-0.5">{s.caption}</span>
            </button>
          );
        })}
      </div>

      {puppy && (
        <div className="mt-5 pt-5 border-t border-black/[0.05] flex items-center gap-3">
          <Placeholder label="puppy photo" className="w-[56px] h-[56px] rounded-[10px]" tone="warm" />
          <div className="min-w-0">
            <div className="text-[12.5px] text-warm-900 font-medium">{puppy.collar} collar · {puppy.sex} · {puppy.colour}</div>
            <div className="text-[11.5px] text-warm-500">{litter?.name} · go home {litter?.goHomeDate ? D.shortDate(litter.goHomeDate) : 'TBD'}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[11px] uppercase tracking-[0.08em] text-warm-400">Puppy price</div>
            <div className="font-serif text-[20px] text-warm-900">{D.ZAR(puppy.price || 28000)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ client, litter, puppy }) {
  const D = window.PAW_DATA;
  const paid = client.paid || 0;
  const total = client.total || puppy?.price || 0;
  const remaining = total ? Math.max(0, total - paid) : 0;
  const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {total > 0 && (
          <Card>
            <CardHeader title="Payment progress" subtitle={`${D.ZAR(paid)} of ${D.ZAR(total)} received`} action={
              <span className="text-[12.5px] font-mono text-warm-500 tabular-nums">{pct}%</span>
            } />
            <div className="px-[22px] pb-5">
              <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #d98e3a, #c47420)' }} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Paid</div>
                  <div className="font-serif text-[20px] text-warm-900 mt-0.5">{D.ZAR(paid)}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Remaining</div>
                  <div className="font-serif text-[20px] text-warm-900 mt-0.5">{D.ZAR(remaining)}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Next due</div>
                  <div className="font-serif text-[20px] text-warm-900 mt-0.5">{client.bookingExpiresAt ? D.shortDate(client.bookingExpiresAt) : '—'}</div>
                </div>
              </div>
            </div>
          </Card>
        )}
        <Card>
          <CardHeader title="Preferences" subtitle="From application" />
          <div className="px-[22px] pb-5 grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Breed · Size', 'Cavapoo · Mini'],
              ['Sex', 'No preference'],
              ['Colour', 'Apricot / Cream'],
              ['Living', 'House with garden'],
              ['Experience', '12+ years with dogs'],
              ['Ready by', 'Within 6 months'],
              ['Budget', 'R10k – R20k'],
              ['Considers rehome', 'Yes'],
            ].map(([k,v]) => (
              <div key={k}>
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">{k}</div>
                <div className="text-[13px] text-warm-800 mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Matched puppy" />
          <div className="px-[22px] pb-5">
            {puppy ? (
              <div>
                <Placeholder label={`${puppy.collar.toLowerCase()} collar · dog photo`} className="aspect-[4/3] rounded-[10px] mb-3" />
                <div className="text-[13px] font-medium text-warm-900">{puppy.collar} collar · {puppy.colour}</div>
                <div className="text-[11.5px] text-warm-500 mt-0.5">{litter?.name}</div>
                <Button variant="secondary" size="sm" className="mt-3 w-full">Open in litter</Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center mb-3">
                  <Glyph shape="paw" color="#9a8871" size={20} />
                </div>
                <div className="text-[13px] text-warm-700">No puppy matched</div>
                <div className="text-[11.5px] text-warm-500 mt-1">Client will see available puppies at selection day.</div>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Admin notes" />
          <div className="px-[22px] pb-5">
            <div className="text-[13px] text-warm-700 leading-relaxed bg-warm-50 rounded-[10px] p-3 border border-warm-100 italic">
              "Family of four, two kids (8 & 11), previous cockapoo. Vet reference checked Feb. Prefers apricot or cream — flexible on sex. Can collect from farm."
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PaymentsTab({ payments, client }) {
  const D = window.PAW_DATA;
  const typeLabel = { deposit: 'Waitlist deposit', booking: 'Booking payment', final: 'Final balance' };

  return (
    <Card>
      <CardHeader title="Payment ledger" action={<Button variant="secondary" size="sm">Record payment</Button>} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {['Type','Reference','Amount','Status','Date',''].map(h => <th key={h} className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400 font-medium px-[18px] py-3 text-left border-b border-black/[0.06] whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b border-black/[0.04] last:border-0">
                <td className="px-[18px] py-3 text-[13px] text-warm-800 font-medium">{typeLabel[p.type]}</td>
                <td className="px-[18px] py-3 text-[12px] font-mono text-warm-500">{p.reference}</td>
                <td className="px-[18px] py-3 text-[13px] font-medium text-warm-900 tabular-nums">{D.ZAR(p.amount)}</td>
                <td className="px-[18px] py-3">
                  {p.status === 'complete' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#e4ebe0', color: '#3e5a2a' }}>
                      <Glyph shape="check" color="#3e5a2a" size={10} /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#fef3e7', color: '#a35c17' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c47420]" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-[18px] py-3 text-[12.5px] text-warm-500 tabular-nums whitespace-nowrap">{p.paidAt ? D.formatDate(p.paidAt) : p.dueDate ? `Due ${D.shortDate(p.dueDate)}` : '—'}</td>
                <td className="px-[18px] py-3 text-right"><span className="text-[12px] text-[#c47420] font-medium">Invoice →</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ApplicationTab({ client }) {
  const sections = [
    { title: 'Personal', fields: [
      ['Primary caregiver', `${client.firstName}`],
      ['Residence', 'Own'],
      ['Allergies to dogs', 'No'],
      ['Family agrees', 'Yes'],
      ['Dog lives indoors', 'Yes'],
    ]},
    { title: 'Home', fields: [
      ['Living type', 'House'],
      ['Garden', 'Yes, fenced'],
      ['Yard size', 'Medium (~500m²)'],
      ['Pool or driveway', 'Pool, fenced'],
      ['Hours alone per day', '2–3 hours'],
    ]},
    { title: 'Experience', fields: [
      ['Previous dogs', 'Cockapoo (2012–2024)'],
      ['Returned pet', 'No'],
      ['Given pet away', 'No'],
      ['Obedience classes', 'Willing'],
    ]},
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map(s => (
        <Card key={s.title}>
          <CardHeader title={s.title} />
          <div className="px-[22px] pb-5 space-y-3">
            {s.fields.map(([k,v]) => (
              <div key={k}>
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">{k}</div>
                <div className="text-[13px] text-warm-800 mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function DocumentsTab() {
  const docs = [
    { name: 'Breeder contract',      status: 'signed',   at: '2026-02-24' },
    { name: 'Vaccination schedule',  status: 'shared',   at: '2026-02-14' },
    { name: 'Health records',        status: 'shared',   at: '2026-02-14' },
    { name: 'Go-home pack',          status: 'pending',  at: null },
    { name: 'Pet insurance info',    status: 'optional', at: null },
  ];
  const badge = { signed: ['#e4ebe0','#3e5a2a','Signed'], shared: ['#e5ecf2','#1e5b8a','Shared'], pending: ['#fef3e7','#a35c17','Pending'], optional: ['#f5f0e8','#7a6a58','Optional'] };
  return (
    <Card>
      <table className="w-full">
        <tbody>
          {docs.map(d => {
            const [bg, fg, label] = badge[d.status];
            return (
              <tr key={d.name} className="border-b border-black/[0.04] last:border-0">
                <td className="px-[22px] py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-10 rounded bg-warm-100 border border-warm-200 flex items-center justify-center">
                      <Glyph shape="doc" color="#7a6a58" size={16} />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium text-warm-900">{d.name}</div>
                      <div className="text-[11.5px] text-warm-500">{d.at ? `Updated ${new Date(d.at).toLocaleDateString('en-ZA')}` : 'Not yet shared'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[22px] py-4 text-right">
                  <span className="inline-block px-2.5 py-[4px] rounded-full text-[11.5px] font-medium mr-3" style={{ background: bg, color: fg }}>{label}</span>
                  <span className="text-[12px] text-[#c47420] font-medium">Open →</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function ActivityTab({ activity }) {
  const actorTone = { system: '#7a6a58', admin: '#c47420', client: '#1e5b8a' };
  return (
    <Card>
      <div className="px-[22px] py-5">
        <div className="relative pl-5">
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-warm-200" />
          {activity.map((a, i) => (
            <div key={i} className="relative pb-5 last:pb-0">
              <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 border-white" style={{ background: actorTone[a.actor] }} />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-warm-800">{a.text}</span>
                <span className="text-[11.5px] text-warm-400 font-mono tabular-nums">{a.when}</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-warm-400 mt-1">{a.actor}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

Object.assign(window, { ClientsScreen, ClientDetailScreen });
