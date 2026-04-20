// ─── Dashboard screen ────────────────────────────────────────────────────────

function DashboardScreen({ onNavigate }) {
  const D = window.PAW_DATA;
  const counts = {
    litters: D.litters.filter(l => l.status !== 'completed').length,
    clients: D.clients.length,
    enquiries: D.clients.filter(c => c.stage === 'enquired').length,
    waitlisted: D.clients.filter(c => c.stage === 'waitlisted').length,
    revenueMtd: D.payments.filter(p => p.status === 'complete' && p.paidAt && p.paidAt.startsWith('2026-04')).reduce((s,p)=>s+p.amount,0),
  };

  const attention = [
    { key: 'review', tone: '#c47420', bg: '#fef3e7', count: 3, text: 'new applications to review', route: 'clients' },
    { key: 'booking', tone: '#8d2a4a', bg: '#f6e5e9', count: 1, text: 'booking payment due in 7 days', route: 'payments' },
    { key: 'docs',   tone: '#1e5b8a', bg: '#e5ecf2', count: 2, text: 'clients with documents to approve', route: 'clients' },
    { key: 'reserved', tone: '#7a47a8', bg: '#e8dff0', count: 1, text: 'puppy reserved awaiting booking', route: 'litters' },
  ];

  const activity = [
    { color: '#c47420', text: 'Sophia Fourie submitted an application',            time: '2h ago', route: 'clients' },
    { color: '#8d2a4a', text: 'Marius Joubert reserved Sky (Wren litter)',         time: '6h ago', route: 'litters' },
    { color: '#4a6741', text: 'Ruan Botha approved — moved to waitlist',           time: '1d ago', route: 'clients' },
    { color: '#1e5b8a', text: 'Thandi Mokoena signed go-home contract',            time: '2d ago', route: 'clients' },
    { color: '#c47420', text: 'Kagiso Mahlangu submitted an application',           time: '3d ago', route: 'clients' },
    { color: '#4a6741', text: 'Hannah van der Merwe paid final balance — R18,000',  time: '4d ago', route: 'payments' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1440px]">
      <PageHeader
        breadcrumb="Tuesday, 21 April 2026"
        title="Good afternoon, Sarah."
        subtitle="Three new applications, one booking payment due this week, and Wren's litter goes home on Saturday."
        action={<div className="flex gap-2">
          <Button variant="secondary" icon={<Glyph shape="calendar" color="#7a6a58" size={14}/>}>This week</Button>
          <Button icon={<Glyph shape="plus" color="#fff" size={14}/>}>New litter</Button>
        </div>}
      />

      {/* Needs attention band */}
      <div className="mb-7 rounded-[14px] px-5 py-4"
           style={{ background: 'linear-gradient(180deg, #fdf6ee 0%, #f8e8d0 100%)', border: '1px solid #f0cfa0' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[#c47420]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#824614]">Needs your attention</p>
          </div>
          <span className="text-[11.5px] text-[#a35c17]">7 items · last checked 12m ago</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {attention.map(a => (
            <button key={a.key} onClick={() => onNavigate(a.route)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-white/80 hover:bg-white transition-colors text-[12.5px]"
                    style={{ borderColor: a.tone + '55', color: a.tone }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.tone }} />
              <span className="font-semibold">{a.count}</span>
              <span className="font-medium">{a.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        <StatCard label="Active litters" value={counts.litters} accent="brand" sub="Wren · Juniper · Ivy (planned)" onClick={() => onNavigate('litters')} />
        <StatCard label="Clients" value={counts.clients} accent="green" sub={`${counts.waitlisted} on waitlist`} onClick={() => onNavigate('clients')} />
        <StatCard label="New enquiries" value={counts.enquiries} accent="blue" sub="Awaiting review" onClick={() => onNavigate('clients')} />
        <StatCard label="April revenue" value={D.ZAR(counts.revenueMtd)} accent="plum" sub="Month-to-date" onClick={() => onNavigate('payments')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Client pipeline" subtitle="Stages from first enquiry to go-home day" action={
              <button onClick={() => onNavigate('clients')} className="text-[12.5px] text-[#c47420] font-medium hover:underline">View all clients →</button>
            } />
            <div className="px-[22px] pb-5">
              <Pipeline />
            </div>
          </Card>

          <div className="mt-5">
            <Card>
              <CardHeader title="Recent activity" subtitle="Last 7 days" />
              <div>
                {activity.map((a, i) => (
                  <button key={i} onClick={() => onNavigate(a.route)}
                          className="w-full flex items-center gap-3 px-[22px] py-3 border-t border-black/[0.05] hover:bg-warm-50 transition-colors text-left">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="text-[13px] text-warm-800 flex-1">{a.text}</span>
                    <span className="text-[11.5px] text-warm-400 tabular-nums">{a.time}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming go-home */}
          <Card>
            <CardHeader title="Upcoming go-home" />
            <div className="px-[22px] pb-5">
              {D.litters.filter(l => l.goHomeDate && new Date(l.goHomeDate) > new Date('2026-04-01')).slice(0,2).map(l => (
                <div key={l.id} className="flex gap-3 py-3 border-b border-black/[0.05] last:border-0">
                  <Placeholder label="dog photo" className="w-[64px] h-[64px] rounded-[10px] shrink-0" tone="warm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StagePill stage={l.status === 'available' ? 'puppy_booked' : 'puppy_fully_paid'} size="sm" />
                    </div>
                    <div className="text-[13px] font-medium text-warm-900 truncate">{l.name}</div>
                    <div className="text-[11.5px] text-warm-500 mt-0.5">{l.breed} · {l.size} · goes home {D.shortDate(l.goHomeDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue sparkline */}
          <Card>
            <CardHeader title="Revenue — last 6 months" />
            <div className="px-[22px] pb-5">
              <RevenueChart />
              <div className="flex items-baseline justify-between mt-4">
                <div>
                  <div className="font-serif text-[24px] text-warm-900">R246,500</div>
                  <div className="text-[11.5px] text-warm-500">collected Nov 25 – Apr 26</div>
                </div>
                <div className="text-[12px] text-[#4a6741] font-medium">▲ 18%</div>
              </div>
            </div>
          </Card>

          {/* Next selection */}
          <Card>
            <div className="px-[22px] py-5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-warm-500 mb-2">Next selection day</div>
              <div className="font-serif text-[24px] text-warm-900 leading-tight">Sun, 20 April</div>
              <div className="text-[13px] text-warm-600 mt-1">Juniper's litter · 4 clients invited</div>
              <Button variant="secondary" size="sm" className="mt-3.5">Open selection roster</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Pipeline() {
  const D = window.PAW_DATA;
  const order = ['enquired','approved','waitlisted','puppy_reserved','puppy_booked','puppy_fully_paid'];
  const byStage = Object.fromEntries(order.map(s => [s, D.clients.filter(c => c.stage === s).length]));
  const max = Math.max(...Object.values(byStage));

  return (
    <div>
      <div className="grid grid-cols-6 gap-2 mt-2">
        {order.map((s, i) => {
          const style = STAGE_STYLES[s];
          const count = byStage[s];
          const pct = max ? (count / max) * 100 : 0;
          return (
            <div key={s}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
                <span className="text-[10.5px] uppercase tracking-[0.08em] text-warm-500 font-medium truncate">{style.label}</span>
              </div>
              <div className="font-serif text-[28px] leading-none text-warm-900">{count}</div>
              <div className="mt-2.5 h-1.5 rounded-full bg-warm-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.dot }} />
              </div>
              <div className="text-[10.5px] text-warm-400 mt-1.5">{i < order.length - 1 ? `${Math.max(0, byStage[order[i]] - byStage[order[i+1]])} moved on` : 'complete'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueChart() {
  const months = ['Nov','Dec','Jan','Feb','Mar','Apr'];
  const values = [22000, 38000, 46000, 35000, 58000, 47500];
  const max = Math.max(...values);
  const W = 300, H = 80, step = W / (values.length - 1);
  const pts = values.map((v,i) => [i * step, H - (v / max) * (H - 10) - 5]);
  const path = pts.map((p,i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${W} ${H} L 0 ${H} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" preserveAspectRatio="none" style={{ height: 100 }}>
        <defs>
          <linearGradient id="rgrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c47420" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c47420" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rgrad)" />
        <path d={path} stroke="#c47420" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#c47420" />)}
        {months.map((m,i) => (
          <text key={m} x={i*step} y={H+14} fontSize="9" fill="#9a8871" textAnchor={i===0?'start':i===months.length-1?'end':'middle'} fontFamily="ui-monospace,monospace">{m}</text>
        ))}
      </svg>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
