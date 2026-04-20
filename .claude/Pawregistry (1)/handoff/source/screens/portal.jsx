// ─── Portal-specific UI (mobile-first) ───────────────────────────────────────

const { useState: useSP, useEffect: useEP } = React;

function PortalShell({ client, route, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-warm-100 pb-20 md:pb-0">
      {/* Desktop topbar */}
      <div className="hidden md:block sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-black/[0.05]">
        <div className="max-w-[980px] mx-auto h-[62px] flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2a2520' }}>
              <Glyph shape="paw" color="#f5f0e8" size={16} />
            </div>
            <div>
              <div className="font-serif text-[18px] text-warm-900 leading-tight">Pawregistry</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-warm-500">Client portal</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {[['home','Home'],['litters','Litters'],['updates','Updates'],['payments','Payments'],['documents','Documents']].map(([v,l]) => (
              <button key={v} onClick={() => onNavigate(v)}
                className={`px-3 h-9 rounded-[9px] text-[13px] transition-colors ${route === v ? 'text-warm-900 font-medium bg-warm-100' : 'text-warm-500 hover:text-warm-800'}`}>
                {l}
              </button>
            ))}
            <div className="w-px h-5 bg-warm-200 mx-2" />
            <Avatar name={client.firstName + ' ' + client.lastName} size={32} />
          </nav>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/[0.05]">
        <div className="h-14 flex items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#2a2520' }}>
              <Glyph shape="paw" color="#f5f0e8" size={14} />
            </div>
            <span className="font-serif text-[16px] text-warm-900">Pawregistry</span>
          </div>
          <Avatar name={client.firstName + ' ' + client.lastName} size={30} />
        </div>
      </div>

      <main>{children}</main>

      {/* Mobile bottom tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-black/[0.06]">
        <div className="grid grid-cols-5 h-16">
          {[
            ['home', 'home', 'Home'],
            ['litters', 'paw', 'Litters'],
            ['updates', 'bell', 'Updates'],
            ['payments', 'coin', 'Payments'],
            ['documents', 'doc', 'Docs'],
          ].map(([v, g, l]) => {
            const active = route === v;
            return (
              <button key={v} onClick={() => onNavigate(v)} className="flex flex-col items-center justify-center gap-1">
                <Glyph shape={g} color={active ? '#c47420' : '#9e8b78'} size={18} />
                <span className="text-[10.5px]" style={{ color: active ? '#c47420' : '#9e8b78', fontWeight: active ? 600 : 400 }}>{l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stage-adaptive dashboard ─────────────────────────────────────────────────
function PortalDashboard({ client, persona, onNavigate }) {
  const D = window.PAW_DATA;
  const litter = client.litterId ? D.litters.find(l => l.id === client.litterId) : null;
  const puppy = client.puppyId ? D.puppies.find(p => p.id === client.puppyId) : null;
  const daysToGoHome = litter?.goHomeDate ? Math.max(0, Math.round((new Date(litter.goHomeDate) - new Date('2026-04-21')) / 86400000)) : null;

  return (
    <div className="max-w-[980px] mx-auto">
      {/* Greeting */}
      <div className="px-5 md:px-8 pt-6 md:pt-10 pb-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Tuesday · 21 April</div>
        <h1 className="font-serif text-[30px] md:text-[40px] leading-[1.05] text-warm-900">
          {personalGreeting(persona, daysToGoHome)}
        </h1>
        <p className="text-[13.5px] md:text-[14.5px] text-warm-600 mt-2 max-w-[560px]">
          {personaSubtitle(persona, daysToGoHome, puppy)}
        </p>
      </div>

      {/* Stage-adaptive hero */}
      <div className="px-5 md:px-8 mb-5">
        {persona === 'booked' && puppy && litter && <GoHomeHero puppy={puppy} litter={litter} daysLeft={daysToGoHome} />}
        {persona === 'waitlisted' && <WaitlistedHero client={client} />}
        {persona === 'pickup_week' && puppy && litter && <PickupWeekHero puppy={puppy} litter={litter} daysLeft={daysToGoHome} />}
      </div>

      {/* Journey tracker — always visible */}
      <div className="px-5 md:px-8 mb-5">
        <Card>
          <div className="px-5 md:px-[22px] py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-warm-900">Your journey</h3>
              <span className="text-[11.5px] text-warm-500">Stage {stageIdx(client.stage)+1} of 6</span>
            </div>
            <PortalJourney stage={client.stage} />
          </div>
        </Card>
      </div>

      {/* Two-up: content adapts to whether puppy is assigned */}
      <div className="px-5 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {puppy ? (
          <MatchedPaymentCard client={client} puppy={puppy} litter={litter} onNavigate={onNavigate} />
        ) : (
          <WaitlistDepositCard client={client} onNavigate={onNavigate} />
        )}

        {puppy ? (
          <MatchedUpdateCard puppy={puppy} onNavigate={onNavigate} />
        ) : (
          <UpcomingLittersCard onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

function MatchedPaymentCard({ client, puppy, litter, onNavigate }) {
  const D = window.PAW_DATA;
  const total = client.total || puppy?.price || 28000;
  const paid = client.paid || 0;
  const pct = total ? Math.min(100, Math.round((paid/total)*100)) : 0;
  return (
    <Card>
      <div className="px-5 md:px-[22px] py-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-warm-900">Payments</h3>
          <button onClick={() => onNavigate('payments')} className="text-[12.5px] text-[#c47420] font-medium">View →</button>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="font-serif text-[24px] text-warm-900">{D.ZAR(paid)}</div>
          <div className="text-[12px] text-warm-500">of {D.ZAR(total)}</div>
        </div>
        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct+'%', background: 'linear-gradient(90deg,#d98e3a,#c47420)' }} />
        </div>
        <div className="text-[12px] text-warm-500 mt-3">Final balance R{((total-paid)/1000).toFixed(0)}k due by {litter ? D.shortDate(litter.goHomeDate) : 'TBD'}</div>
      </div>
    </Card>
  );
}

function MatchedUpdateCard({ onNavigate }) {
  return (
    <Card>
      <div className="px-5 md:px-[22px] py-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-warm-900">Latest update</h3>
          <span className="text-[11px] text-warm-500">Week 10</span>
        </div>
        <Placeholder label="puppy photo" className="aspect-[16/9] rounded-[10px] mb-3" />
        <div className="text-[13px] font-medium text-warm-900">Eyes open, tails wagging</div>
        <p className="text-[12.5px] text-warm-600 mt-1.5 leading-relaxed">
          The pups had their first trip outside this week. Olive collar is the cuddliest of the bunch — she's already napping on laps.
        </p>
        <button onClick={() => onNavigate('updates')} className="mt-3 text-[12.5px] text-[#c47420] font-medium">Read all updates →</button>
      </div>
    </Card>
  );
}

function WaitlistDepositCard({ client, onNavigate }) {
  const D = window.PAW_DATA;
  const depositPaid = client.depositStatus === 'paid';
  return (
    <Card>
      <div className="px-5 md:px-[22px] py-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-warm-900">Your deposit</h3>
          <button onClick={() => onNavigate('payments')} className="text-[12.5px] text-[#c47420] font-medium">View →</button>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ background: depositPaid ? '#e4ebe0' : '#fdf6ee' }}>
            {depositPaid
              ? <Glyph shape="check" color="#3e5a2a" size={18}/>
              : <Glyph shape="coin" color="#c47420" size={18}/>}
          </div>
          <div className="min-w-0">
            <div className="font-serif text-[22px] text-warm-900 leading-none">{D.ZAR(client.paid || 0)}</div>
            <div className="text-[11.5px] text-warm-500 mt-1">
              {depositPaid ? 'Paid — you\'re on the deposit list' : 'Waitlist deposit pending'}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-black/[0.05] space-y-2">
          <DepositRow label="Secured Waitlist — R5,000 deposit" active={client.depositTier === 'r5000'} done={depositPaid && client.depositTier === 'r5000'} />
          <DepositRow label="Standard — R500 hold" active={client.depositTier === 'r500'} done={depositPaid && client.depositTier === 'r500'} />
        </div>
      </div>
    </Card>
  );
}

function DepositRow({ label, active, done }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0"
            style={{
              background: done ? '#c47420' : active ? '#fff' : 'transparent',
              borderColor: active || done ? '#c47420' : '#d6c9b8'
            }}>
        {done && <span className="w-1.5 h-1.5 bg-white rounded-full"/>}
      </span>
      <span className={active ? 'text-warm-900 font-medium' : 'text-warm-500'}>{label}</span>
    </div>
  );
}

function UpcomingLittersCard({ onNavigate }) {
  const D = window.PAW_DATA;
  const upcoming = D.litters.filter(l => l.status === 'available' || l.status === 'planned').slice(0, 3);
  return (
    <Card>
      <div className="px-5 md:px-[22px] py-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-warm-900">Litters to watch</h3>
          <button onClick={() => onNavigate('litters')} className="text-[12.5px] text-[#c47420] font-medium">Browse →</button>
        </div>
        <div className="space-y-3">
          {upcoming.map(l => (
            <div key={l.id} className="flex items-center gap-3">
              <Placeholder label="" className="w-11 h-11 rounded-[9px] flex-shrink-0" tone="warm" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-warm-900 truncate">{l.name}</div>
                <div className="text-[11.5px] text-warm-500 truncate">{l.breed} · {l.size} · {l.goHomeDate ? 'home ' + D.shortDate(l.goHomeDate) : 'planned ' + D.shortDate(l.selectionDate)}</div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      background: l.status === 'available' ? '#e4ebe0' : '#f5f0e8',
                      color: l.status === 'available' ? '#3e5a2a' : '#7a6a58'
                    }}>
                {l.status === 'available' ? (l.availableCount + ' open') : 'Planned'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function personalGreeting(persona, days) {
  if (persona === 'booked') return `${days} days to go, Thandi.`;
  if (persona === 'pickup_week') return 'Pickup week is here!';
  return 'Welcome back, Priya.';
}
function personaSubtitle(persona, days, puppy) {
  if (persona === 'booked') return `Your ${puppy?.colour.toLowerCase()} girl, Olive collar, is 9 weeks old and doing beautifully. Here's where everything stands.`;
  if (persona === 'pickup_week') return 'Bring the items from the go-home checklist. Sarah will call you Friday to confirm the time.';
  return "You're #4 on the waitlist. We'll let you know as soon as a matching puppy is available.";
}
function stageIdx(s) { return ['enquired','approved','waitlisted','puppy_reserved','puppy_booked','puppy_fully_paid'].indexOf(s); }

function GoHomeHero({ puppy, litter, daysLeft }) {
  const D = window.PAW_DATA;
  return (
    <div className="rounded-[16px] overflow-hidden border border-black/[0.05]" style={{ background: 'linear-gradient(135deg,#fdf6ee 0%,#f8e8d0 60%,#f0cfa0 100%)' }}>
      <div className="grid grid-cols-1 md:grid-cols-5">
        <div className="md:col-span-2 aspect-[4/3] md:aspect-auto">
          <Placeholder label="olive collar · puppy photo" className="w-full h-full" tone="warm" />
        </div>
        <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#824614] mb-2">Coming home</div>
            <div className="font-serif text-[56px] md:text-[72px] leading-none text-warm-900">{daysLeft}<span className="text-[28px] md:text-[32px] text-warm-500 font-sans font-light"> days</span></div>
            <div className="text-[14px] text-warm-700 mt-2 font-medium">{D.formatDate(litter.goHomeDate)} · from Westerwind</div>
          </div>
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#d6a96a]/40">
            <span className="w-3 h-3 rounded-full" style={{ background: '#6b7a3a' }} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium text-warm-900">{puppy.collar} collar · {puppy.colour}</div>
              <div className="text-[11.5px] text-warm-500">{litter.breed} · {litter.size} · currently {(puppy.weight/1000).toFixed(2)} kg</div>
            </div>
            <Button size="sm">Go-home checklist</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitlistedHero({ client }) {
  return (
    <div className="rounded-[16px] border border-black/[0.05] bg-white p-6 md:p-8">
      <div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Your place on the list</div>
      <div className="flex items-baseline gap-3">
        <div className="font-serif text-[64px] leading-none text-warm-900">#{String(client.priority).padStart(2,'0')}</div>
        <div className="text-[13px] text-warm-500">of 7 on the deposit waitlist</div>
      </div>
      <p className="text-[13.5px] text-warm-600 mt-4 max-w-[480px] leading-relaxed">
        Juniper's Mini Goldendoodle litter is expected in early May. We'll invite the first four waitlist families to selection day on 20 April.
      </p>
    </div>
  );
}

function PickupWeekHero({ puppy, litter }) {
  return (
    <div className="rounded-[16px] border p-6 md:p-8" style={{ background: '#e8efe5', borderColor: '#b6c9ae' }}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#3f5a36] mb-2">This week!</div>
      <div className="font-serif text-[36px] md:text-[44px] leading-[1.05] text-[#2a3f22]">Saturday is go-home day.</div>
      <p className="text-[13.5px] text-[#3f5a36] mt-3 max-w-[520px]">{puppy.collar} collar is ready. Please arrive between 9:00 and 11:00 at Westerwind Farm, Stellenbosch.</p>
    </div>
  );
}

function PortalJourney({ stage }) {
  const stages = ['Enquired','Approved','Waitlisted','Reserved','Booked','Home'];
  const keys = ['enquired','approved','waitlisted','puppy_reserved','puppy_booked','puppy_fully_paid'];
  const cur = keys.indexOf(stage);
  return (
    <div className="relative">
      <div className="absolute left-[14px] right-[14px] top-[13px] h-[2px] bg-warm-200 rounded-full" />
      <div className="absolute left-[14px] top-[13px] h-[2px] rounded-full transition-all duration-500"
           style={{ width: `calc((100% - 28px) * ${cur/5})`, background: '#c47420' }} />
      <div className="relative grid grid-cols-6 gap-1">
        {stages.map((s, i) => {
          const done = i < cur, active = i === cur;
          return (
            <div key={s} className="flex flex-col items-center text-center">
              <span className="w-7 h-7 rounded-full flex items-center justify-center border-2 mb-2"
                    style={{ background: done||active?'#c47420':'#fff', borderColor: done||active?'#c47420':'#d6c9b8', boxShadow: active?'0 0 0 4px rgba(196,116,32,0.18)':'none' }}>
                {done ? <Glyph shape="check" color="#fff" size={12}/> : active ? <span className="w-2 h-2 rounded-full bg-white"/> : null}
              </span>
              <span className={`text-[10.5px] md:text-[11.5px] ${active||done?'text-warm-900 font-medium':'text-warm-400'}`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Portal Litters ───────────────────────────────────────────────────────────
function PortalLitters({ onOpenLitter }) {
  const D = window.PAW_DATA;
  const pub = D.litters.filter(l => l.status !== 'completed');
  return (
    <div className="max-w-[980px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
      <h1 className="font-serif text-[30px] md:text-[38px] text-warm-900">Current & upcoming litters</h1>
      <p className="text-[13.5px] text-warm-600 mt-2 max-w-[540px]">All litters available to our waitlist families.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {pub.map(l => (
          <button key={l.id} onClick={() => onOpenLitter(l.id)} className="text-left bg-white rounded-[16px] border border-black/[0.05] overflow-hidden hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow">
            <Placeholder label={l.coverLabel} className="aspect-[16/10]" />
            <div className="p-5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-warm-500">{l.breed} · {l.size}</div>
              <h3 className="font-serif text-[22px] text-warm-900 mt-1">{l.name}</h3>
              <div className="text-[12.5px] text-warm-500 mt-0.5">{l.damName} × {l.sireName}</div>
              <div className="flex items-center justify-between mt-4 text-[12.5px]">
                <span className="text-warm-600">{l.availableCount ? `${l.availableCount} available` : l.status === 'planned' ? 'Planned' : 'All booked'}</span>
                <span className="text-warm-500">{l.goHomeDate ? 'Home ' + D.shortDate(l.goHomeDate) : 'Selection ' + D.shortDate(l.selectionDate)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PortalLitterDetail({ litterId, onBack }) {
  const D = window.PAW_DATA;
  const l = D.litters.find(x => x.id === litterId);
  const pups = D.puppies.filter(p => p.litterId === litterId);
  return (
    <div className="max-w-[980px] mx-auto px-5 md:px-8 pt-6 md:pt-8 pb-8">
      <button onClick={onBack} className="text-[12.5px] text-warm-500 mb-4">← All litters</button>
      <Placeholder label={l.coverLabel} className="aspect-[16/9] rounded-[16px] mb-5" />
      <div className="text-[11px] uppercase tracking-[0.12em] text-warm-500">{l.breed} · {l.size}</div>
      <h1 className="font-serif text-[32px] md:text-[40px] text-warm-900 leading-[1.05] mt-1">{l.name}</h1>
      <div className="text-[13.5px] text-warm-600 mt-2">Born {l.dateOfBirth ? D.formatDate(l.dateOfBirth) : 'TBD'} · home {l.goHomeDate ? D.formatDate(l.goHomeDate) : 'TBD'}</div>
      <h3 className="font-serif text-[22px] text-warm-900 mt-8 mb-3">The puppies</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {pups.map(p => (
          <div key={p.id} className="bg-white rounded-[14px] border border-black/[0.05] overflow-hidden">
            <Placeholder label={`${p.collar.toLowerCase()} collar`} className="aspect-[4/3]" tone={p.status === 'retained' ? 'dark' : 'warm'} />
            <div className="p-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: collarColorPortal(p.collar) }} />
                <span className="text-[12.5px] font-medium text-warm-900">{p.collar}</span>
              </div>
              <div className="text-[11px] text-warm-500 mt-0.5">{p.sex === 'male' ? '♂' : '♀'} {p.colour}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function collarColorPortal(name) {
  return { Rust:'#b85a1f', Olive:'#6b7a3a', Sky:'#6ea8c9', Plum:'#7a3a6b', Sand:'#d9c28b', Moss:'#4a6741' }[name] || '#9a8871';
}

// ── Portal Payments ──────────────────────────────────────────────────────────
function PortalPayments({ client }) {
  const D = window.PAW_DATA;
  const puppy = client.puppyId ? D.puppies.find(p => p.id === client.puppyId) : null;
  const total = client.total || puppy?.price || 28000;
  const paid = client.paid || 0;
  const remaining = Math.max(0, total - paid);
  const pct = Math.round((paid/total)*100);
  const myPays = D.payments.filter(p => p.clientId === client.id);

  return (
    <div className="max-w-[720px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
      <h1 className="font-serif text-[30px] md:text-[38px] text-warm-900">Payments</h1>
      <p className="text-[13.5px] text-warm-600 mt-2">Your deposits, booking payment and final balance.</p>

      <div className="mt-6 rounded-[16px] border border-black/[0.05] p-6 md:p-8" style={{ background: 'linear-gradient(180deg,#fff 0%,#fdf6ee 100%)' }}>
        <div className="text-[11px] uppercase tracking-[0.14em] text-warm-500">Total for Olive collar</div>
        <div className="flex items-baseline gap-3 mt-2">
          <div className="font-serif text-[48px] md:text-[56px] leading-none text-warm-900">{D.ZAR(paid)}</div>
          <div className="text-[14px] text-warm-500">of {D.ZAR(total)}</div>
        </div>
        <div className="h-2 bg-warm-100 rounded-full overflow-hidden mt-4">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: pct+'%', background: 'linear-gradient(90deg,#d98e3a,#c47420)' }} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div><div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Paid</div><div className="font-serif text-[20px] text-warm-900 mt-0.5">{D.ZAR(paid)}</div></div>
          <div><div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Remaining</div><div className="font-serif text-[20px] text-warm-900 mt-0.5">{D.ZAR(remaining)}</div></div>
          <div><div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Due</div><div className="font-serif text-[20px] text-warm-900 mt-0.5">4 May</div></div>
        </div>
        {remaining > 0 && <Button className="mt-5 w-full justify-center">Pay final balance</Button>}
      </div>

      <h3 className="font-serif text-[22px] text-warm-900 mt-8 mb-3">History</h3>
      <div className="bg-white rounded-[14px] border border-black/[0.05] divide-y divide-black/[0.04]">
        {myPays.map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: p.status === 'complete' ? '#e4ebe0' : '#fef3e7' }}>
              {p.status === 'complete' ? <Glyph shape="check" color="#3e5a2a" size={14}/> : <Glyph shape="coin" color="#a35c17" size={14}/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-warm-900">
                {p.type === 'deposit' ? 'Waitlist deposit' : p.type === 'booking' ? 'Booking payment' : 'Final balance'}
              </div>
              <div className="text-[11.5px] text-warm-500">{p.paidAt ? D.formatDate(p.paidAt) : `Due ${D.shortDate(p.dueDate)}`}</div>
            </div>
            <div className="text-right">
              <div className="text-[13.5px] font-medium text-warm-900 tabular-nums">{D.ZAR(p.amount)}</div>
              <div className="text-[11px] text-warm-500">{p.status === 'complete' ? 'Paid' : 'Pending'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Portal Updates ───────────────────────────────────────────────────────────
function PortalUpdates() {
  const entries = [
    { week: 10, date: '2026-04-18', title: 'Eyes open, tails wagging', body: "The pups had their first trip outside this week. Olive collar is the cuddliest of the bunch — she's already napping on laps. All six are eating solids well.", photoCount: 4 },
    { week: 9,  date: '2026-04-11', title: 'Weaning week', body: 'Everyone has made the switch to puppy mush. We introduced the crate this week and the first short car rides. Temperament-wise, Olive is settling into a calm middle-of-the-pack personality.', photoCount: 3 },
    { week: 8,  date: '2026-04-04', title: 'First vet check-up', body: 'All clean bills of health. Olive weighed in at 1.78 kg — tracking well for her mini size. First vaccinations scheduled for week 10.', photoCount: 2 },
    { week: 7,  date: '2026-03-28', title: 'Names and collars', body: 'We placed soft puppy collars this week — Rust, Olive, Sky, Plum, Sand, Moss. Each one now has their identifier for tracking weight and milestones.', photoCount: 6 },
    { week: 6,  date: '2026-03-21', title: 'Walking and wrestling', body: 'The litter is up on their feet and play-fighting constantly. Very vocal now. Wren is a patient mum but enjoys her time away from them more each day.', photoCount: 3 },
  ];
  return (
    <div className="max-w-[720px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
      <div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Wren's Autumn Litter</div>
      <h1 className="font-serif text-[30px] md:text-[38px] text-warm-900">Weekly journal</h1>
      <p className="text-[13.5px] text-warm-600 mt-2">Updates from Sarah at Westerwind.</p>
      <div className="mt-6 space-y-5">
        {entries.map(e => (
          <article key={e.week} className="bg-white rounded-[16px] border border-black/[0.05] overflow-hidden">
            <div className="flex items-center justify-between px-5 md:px-6 pt-5">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#c47420] font-medium">Week {e.week}</div>
                <div className="text-[11.5px] text-warm-500 mt-0.5">{window.PAW_DATA.formatDate(e.date)}</div>
              </div>
            </div>
            <h3 className="font-serif text-[22px] md:text-[26px] text-warm-900 px-5 md:px-6 mt-2">{e.title}</h3>
            <div className="px-5 md:px-6 mt-3 grid grid-cols-2 gap-2">
              <Placeholder label="puppy photo" className="aspect-square rounded-[10px]" />
              <Placeholder label="puppy photo" className="aspect-square rounded-[10px]" tone="warm" />
            </div>
            <p className="text-[13.5px] text-warm-700 px-5 md:px-6 py-4 leading-[1.6]">{e.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function PortalDocuments() {
  const docs = [
    { name: 'Signed breeder contract', status: 'signed', date: '2026-02-24' },
    { name: 'Puppy health record', status: 'signed', date: '2026-04-08' },
    { name: 'Vaccination schedule', status: 'signed', date: '2026-04-08' },
    { name: 'Go-home pack (PDF)', status: 'available', date: null },
    { name: 'Feeding guide — first 4 weeks', status: 'available', date: null },
    { name: 'Microchip certificate', status: 'pending', date: null },
  ];
  return (
    <div className="max-w-[720px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
      <h1 className="font-serif text-[30px] md:text-[38px] text-warm-900">Documents</h1>
      <p className="text-[13.5px] text-warm-600 mt-2">Everything you need, signed and stored.</p>
      <div className="mt-6 bg-white rounded-[14px] border border-black/[0.05] divide-y divide-black/[0.04]">
        {docs.map(d => (
          <div key={d.name} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: d.status === 'signed' ? '#e4ebe0' : d.status === 'available' ? '#fdf6ee' : '#f5f0e8' }}>
              <Glyph shape="doc" color={d.status === 'signed' ? '#3e5a2a' : d.status === 'available' ? '#c47420' : '#9e8b78'} size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-warm-900 truncate">{d.name}</div>
              <div className="text-[11.5px] text-warm-500">
                {d.status === 'signed' ? `Signed ${window.PAW_DATA.shortDate(d.date)}` : d.status === 'available' ? 'Ready to download' : 'Waiting for breeder'}
              </div>
            </div>
            <button className="text-[12.5px] text-[#c47420] font-medium">{d.status === 'pending' ? '—' : 'Open'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { PortalShell, PortalDashboard, PortalLitters, PortalLitterDetail, PortalPayments, PortalUpdates, PortalDocuments });
