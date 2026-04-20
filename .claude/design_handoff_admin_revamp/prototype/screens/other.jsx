// ─── Litters + Litter Detail + Waitlist + Payments ──────────────────────────

function LittersScreen({ onOpenLitter }) {
  const D = window.PAW_DATA;
  const [filter, setFilter] = React.useState('active');

  const filters = [
    { value: 'active',    label: 'Active',    count: D.litters.filter(l => l.status !== 'completed').length },
    { value: 'planned',   label: 'Planned',   count: D.litters.filter(l => l.status === 'planned').length },
    { value: 'available', label: 'Available', count: D.litters.filter(l => l.status === 'available').length },
    { value: 'booked',    label: 'Booked',    count: D.litters.filter(l => l.status === 'booked').length },
    { value: 'completed', label: 'Completed', count: D.litters.filter(l => l.status === 'completed').length },
  ];

  const list = D.litters.filter(l => filter === 'active' ? l.status !== 'completed' : l.status === filter);

  return (
    <div className="p-6 md:p-8 max-w-[1440px]">
      <PageHeader
        title="Litters"
        subtitle="Past, present and planned — across all breeds."
        action={<Button icon={<Glyph shape="plus" color="#fff" size={14}/>}>Plan new litter</Button>}
      />
      <div className="mb-4"><Segmented options={filters} value={filter} onChange={setFilter} /></div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(l => <LitterCard key={l.id} litter={l} onOpen={() => onOpenLitter(l.id)} />)}
      </div>
    </div>
  );
}

function LitterCard({ litter, onOpen }) {
  const D = window.PAW_DATA;
  const available = litter.availableCount ?? 0;
  const booked = (litter.puppyCount ?? 0) - available;
  const pct = litter.puppyCount ? (booked / litter.puppyCount) * 100 : 0;

  return (
    <button onClick={onOpen} className="text-left bg-white rounded-[14px] border border-black/[0.06] overflow-hidden hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow">
      <Placeholder label={litter.coverLabel} className="aspect-[16/9]" tone={litter.status === 'planned' ? 'cream' : 'warm'} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-1.5">
          <StagePill stage={litter.status === 'available' ? 'waitlisted' : litter.status === 'booked' ? 'puppy_booked' : litter.status === 'completed' ? 'puppy_fully_paid' : 'enquired'} size="sm" />
          <span className="text-[11px] text-warm-500 font-mono tabular-nums">{litter.breed} · {litter.size}</span>
        </div>
        <h3 className="font-serif text-[22px] text-warm-900 leading-tight">{litter.name}</h3>
        <div className="text-[12.5px] text-warm-500 mt-1">{litter.damName} × {litter.sireName}</div>

        {litter.puppyCount && (
          <>
            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Puppies placed</div>
                <div className="font-serif text-[22px] text-warm-900">{booked}<span className="text-warm-400 text-[16px]"> / {litter.puppyCount}</span></div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Go home</div>
                <div className="text-[13px] text-warm-800 font-medium">{litter.goHomeDate ? D.formatDate(litter.goHomeDate) : 'TBD'}</div>
              </div>
            </div>
            <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden mt-2.5">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#c47420' }} />
            </div>
          </>
        )}
        {!litter.puppyCount && (
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-warm-500">
            <Glyph shape="calendar" color="#9a8871" size={14} /> Expected selection {D.shortDate(litter.selectionDate)}
          </div>
        )}
      </div>
    </button>
  );
}

function LitterDetailScreen({ litterId, onBack, onOpenClient }) {
  const D = window.PAW_DATA;
  const litter = D.litters.find(l => l.id === litterId);
  const pups = D.puppies.filter(p => p.litterId === litterId);

  return (
    <div className="p-6 md:p-8 max-w-[1440px]">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-warm-500 hover:text-warm-800 mb-4">
        <span>←</span> All litters
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        <Placeholder label={litter.coverLabel} className="aspect-[16/10] lg:col-span-2 rounded-[14px]" />
        <div className="lg:col-span-3">
          <StagePill stage={litter.status === 'available' ? 'waitlisted' : 'puppy_booked'} />
          <h1 className="font-serif text-[36px] text-warm-900 leading-tight mt-2">{litter.name}</h1>
          <div className="text-[14px] text-warm-600 mt-1">{litter.breed} · {litter.size} · {litter.damName} × {litter.sireName}</div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              ['Born', litter.dateOfBirth ? D.formatDate(litter.dateOfBirth) : '—'],
              ['Go home', litter.goHomeDate ? D.formatDate(litter.goHomeDate) : '—'],
              ['Selection', D.formatDate(litter.selectionDate)],
              ['Deposit', D.ZAR(litter.depositAmount)],
            ].map(([k,v]) => (
              <div key={k}>
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">{k}</div>
                <div className="text-[13.5px] text-warm-800 font-medium mt-0.5">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <Button>Publish update</Button>
            <Button variant="secondary">Manage selection roster</Button>
            <Button variant="ghost">Edit litter</Button>
          </div>
        </div>
      </div>

      <h3 className="text-[15px] font-medium text-warm-900 mb-3">Puppies <span className="text-warm-400 font-normal">· {pups.length}</span></h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pups.map(p => {
          const client = p.clientId ? D.clients.find(c => c.id === p.clientId) : null;
          const statusStage =
            p.status === 'puppy_fully_paid' ? 'puppy_fully_paid' :
            p.status === 'booked' ? 'puppy_booked' :
            p.status === 'reserved' ? 'puppy_reserved' :
            p.status === 'available' ? 'approved' : 'rejected';
          return (
            <Card key={p.id} className="overflow-hidden">
              <Placeholder label={`${p.collar.toLowerCase()} collar · photo`} className="aspect-[4/3]" tone={p.status === 'retained' ? 'dark' : 'warm'} />
              <div className="px-[18px] py-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: collarColor(p.collar) }} />
                    <span className="text-[13px] font-medium text-warm-900">{p.collar}</span>
                  </div>
                  {p.status === 'retained' ? (
                    <span className="text-[10.5px] px-2 py-[3px] rounded-full font-medium bg-warm-900 text-warm-50">Retained</span>
                  ) : <StagePill stage={statusStage} size="sm" />}
                </div>
                <div className="text-[12px] text-warm-500">{p.sex === 'male' ? '♂' : '♀'} {p.colour} · {(p.weight/1000).toFixed(2)} kg</div>
                {client && (
                  <button onClick={() => onOpenClient(client.id)} className="mt-3 flex items-center gap-2 w-full text-left bg-warm-50 rounded-[10px] p-2.5 hover:bg-warm-100 transition-colors">
                    <Avatar name={client.firstName + ' ' + client.lastName} size={26} />
                    <span className="text-[12.5px] text-warm-800 truncate flex-1">{client.firstName} {client.lastName}</span>
                    <span className="text-[11.5px] text-[#c47420]">→</span>
                  </button>
                )}
                {!client && p.status === 'available' && (
                  <div className="mt-3 text-[12px] text-warm-500 italic">Available at selection day</div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function collarColor(name) {
  return { Rust:'#b85a1f', Olive:'#6b7a3a', Sky:'#6ea8c9', Plum:'#7a3a6b', Sand:'#d9c28b', Moss:'#4a6741' }[name] || '#9a8871';
}

// ── Waitlist with drag-reorder ───────────────────────────────────────────────

function WaitlistScreen({ onOpenClient }) {
  const D = window.PAW_DATA;
  const initial = D.clients.filter(c => c.stage === 'waitlisted' || c.stage === 'puppy_reserved' || c.stage === 'puppy_booked').sort((a,b) => a.priority - b.priority);
  const [queue, setQueue] = React.useState(initial.map(c => c.id));
  const [dragId, setDragId] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);

  const [tab, setTab] = React.useState('deposit');
  const onDeposit = queue.filter(id => {
    const c = D.clients.find(x => x.id === id);
    return c.depositStatus !== 'none' && c.depositTier !== null;
  });
  const noDeposit = queue.filter(id => {
    const c = D.clients.find(x => x.id === id);
    return c.depositStatus === 'none' || c.depositTier === null;
  });
  const list = tab === 'deposit' ? onDeposit : noDeposit;

  function reorder(fromId, toIdx) {
    setQueue(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      if (fromIdx < 0) return prev;
      next.splice(fromIdx, 1);
      // insert at position toIdx (relative to original list)
      // compute insertion index in full queue by finding toIdx-th id of same tab
      const targetList = list.filter(id => id !== fromId);
      const targetId = targetList[Math.min(toIdx, targetList.length - 1)];
      const targetIdx = targetId ? next.indexOf(targetId) : next.length;
      next.splice(targetIdx, 0, fromId);
      return next;
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      <PageHeader
        title="Waitlist"
        subtitle="Priority queue — drag to reorder. Lower number = next in line."
        action={<Button variant="secondary">Match to available litter</Button>}
      />

      <div className="mb-4">
        <Segmented
          options={[
            { value: 'deposit',    label: 'With deposit',    count: onDeposit.length },
            { value: 'no_deposit', label: 'No deposit',      count: noDeposit.length },
          ]}
          value={tab} onChange={setTab}
        />
      </div>

      <Card>
        <div>
          {list.map((id, idx) => {
            const c = D.clients.find(x => x.id === id);
            const isDragging = dragId === id;
            const isOver = overIdx === idx && dragId && dragId !== id;
            return (
              <div
                key={id}
                draggable
                onDragStart={() => setDragId(id)}
                onDragOver={e => { e.preventDefault(); setOverIdx(idx); }}
                onDragEnd={() => { if (dragId && overIdx !== null) reorder(dragId, overIdx); setDragId(null); setOverIdx(null); }}
                onDrop={e => e.preventDefault()}
                className={`flex items-center gap-4 px-4 py-3.5 border-b border-black/[0.04] last:border-0 transition-all ${isDragging ? 'opacity-40' : ''} ${isOver ? 'bg-warm-50' : ''}`}
                style={isOver ? { boxShadow: 'inset 0 2px 0 #c47420' } : undefined}
              >
                <span className="cursor-grab active:cursor-grabbing text-warm-300 hover:text-warm-500"><Glyph shape="grip" color="currentColor" size={18} /></span>
                <span className="font-mono text-[13px] text-warm-700 tabular-nums w-8">#{String(idx + 1).padStart(2,'0')}</span>
                <Avatar name={c.firstName + ' ' + c.lastName} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-warm-900">{c.firstName} {c.lastName}</div>
                  <div className="text-[11.5px] text-warm-500">{c.email} · {c.city}</div>
                </div>
                <div className="hidden md:block"><StagePill stage={c.stage} size="sm" /></div>
                <div className="hidden md:block"><DepositPill status={c.depositStatus} tier={c.depositTier} /></div>
                <div className="hidden lg:block text-[12px] text-warm-500 tabular-nums whitespace-nowrap">On list {Math.round((new Date('2026-04-21') - new Date(c.updatedAt))/(86400000))}d</div>
                <button onClick={() => onOpenClient(c.id)} className="text-[12px] text-[#c47420] font-medium whitespace-nowrap">Open →</button>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-[11.5px] text-warm-400 mt-3">
        Active queue: clients at <span className="text-warm-600">waitlisted</span>, <span className="text-warm-600">reserved</span>, or <span className="text-warm-600">booked</span>. Clients remain in queue until fully paid.
      </p>
    </div>
  );
}

// ── Payments screen ──────────────────────────────────────────────────────────

function PaymentsScreen({ onOpenClient }) {
  const D = window.PAW_DATA;
  const [filter, setFilter] = React.useState('all');

  const all = D.payments;
  const complete = all.filter(p => p.status === 'complete');
  const pending = all.filter(p => p.status === 'pending');
  const totalIn = complete.reduce((s,p) => s+p.amount, 0);
  const outstanding = pending.reduce((s,p) => s+p.amount, 0);
  const monthIn = complete.filter(p => p.paidAt && p.paidAt.startsWith('2026-04')).reduce((s,p) => s+p.amount, 0);
  const overdue = pending.filter(p => p.dueDate && new Date(p.dueDate) < new Date('2026-04-21'));

  const filters = [
    { value: 'all',      label: 'All',        count: all.length },
    { value: 'pending',  label: 'Pending',    count: pending.length },
    { value: 'complete', label: 'Paid',       count: complete.length },
    { value: 'overdue',  label: 'Overdue',    count: overdue.length },
  ];
  const shown = filter === 'all' ? all : filter === 'overdue' ? overdue : all.filter(p => p.status === filter);

  const typeLabel = { deposit: 'Waitlist deposit', booking: 'Booking payment', final: 'Final balance' };
  const typeAccent = { deposit: '#1e5b8a', booking: '#7a47a8', final: '#4a6741' };

  return (
    <div className="p-6 md:p-8 max-w-[1440px]">
      <PageHeader
        title="Payments"
        subtitle="Track deposits, booking payments and final balances."
        action={<div className="flex gap-2">
          <Button variant="secondary">Export ledger</Button>
          <Button icon={<Glyph shape="plus" color="#fff" size={14}/>}>Create invoice</Button>
        </div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Collected YTD" value={D.ZAR(totalIn)} accent="green" sub={`${complete.length} payments`} />
        <StatCard label="This month"    value={D.ZAR(monthIn)} accent="brand" sub="April 2026" />
        <StatCard label="Outstanding"   value={D.ZAR(outstanding)} accent="plum" sub={`${pending.length} pending`} />
        <StatCard label="Overdue"       value={overdue.length} accent="rust" sub="Immediate follow-up" />
      </div>

      <div className="mb-4"><Segmented options={filters} value={filter} onChange={setFilter} /></div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Reference','Client','Type','Amount','Status','Date',''].map(h => <th key={h} className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400 font-medium px-[18px] py-3 text-left border-b border-black/[0.06] whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map(p => (
                <tr key={p.id} onClick={() => onOpenClient(p.clientId)} className="cursor-pointer border-b border-black/[0.04] last:border-0 hover:bg-warm-50 transition-colors">
                  <td className="px-[18px] py-3 text-[12px] font-mono text-warm-700">{p.reference}</td>
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.clientName} size={28} />
                      <span className="text-[13px] text-warm-800 font-medium">{p.clientName}</span>
                    </div>
                  </td>
                  <td className="px-[18px] py-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: typeAccent[p.type] }} />
                      {typeLabel[p.type]}
                    </span>
                  </td>
                  <td className="px-[18px] py-3 text-[13px] font-medium text-warm-900 tabular-nums whitespace-nowrap">{D.ZAR(p.amount)}</td>
                  <td className="px-[18px] py-3">
                    {p.status === 'complete' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#e4ebe0', color: '#3e5a2a' }}>
                        <Glyph shape="check" color="#3e5a2a" size={10}/> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#fef3e7', color: '#a35c17' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c47420]" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-[18px] py-3 text-[12.5px] text-warm-500 tabular-nums whitespace-nowrap">{p.paidAt ? D.formatDate(p.paidAt) : `Due ${D.shortDate(p.dueDate)}`}</td>
                  <td className="px-[18px] py-3 text-right"><span className="text-[12px] text-[#c47420] font-medium">Invoice →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { LittersScreen, LitterDetailScreen, WaitlistScreen, PaymentsScreen });
