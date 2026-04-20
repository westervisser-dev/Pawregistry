// ─── Admin sidebar + top bar ─────────────────────────────────────────────────
const { useState: useStateShell } = React;

function Sidebar({ route, onNavigate }) {
  const nav = [
    { to: 'dashboard', label: 'Dashboard', glyph: 'home' },
    { to: 'litters',   label: 'Litters',   glyph: 'paw' },
    { to: 'clients',   label: 'Clients',   glyph: 'people' },
    { to: 'waitlist',  label: 'Waitlist',  glyph: 'grip' },
    { to: 'payments',  label: 'Payments',  glyph: 'coin' },
    { divider: true },
    { to: 'updates',   label: 'Updates',   glyph: 'bell' },
    { to: 'documents', label: 'Documents', glyph: 'doc' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[232px] shrink-0 text-[13.5px]"
           style={{ background: '#2a2520', color: 'rgba(240,237,234,0.85)' }}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: '#f5f0e8' }}>
            <Glyph shape="paw" color="#c47420" size={20} />
          </div>
          <div>
            <span className="font-serif text-[17px] text-[#F5F0E8] block leading-tight">Pawregistry</span>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.14em] mt-0.5 block">Breeder · Admin</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map((item, i) => {
          if (item.divider) return <div key={`d-${i}`} className="h-px bg-white/10 mx-3 my-2.5" />;
          const active = route === item.to;
          return (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              className={`flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] transition-colors text-left ${
                active ? 'text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
              }`}
              style={active ? { background: '#c47420' } : undefined}
            >
              <Glyph shape={item.glyph} color={active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)'} size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Kennel footer */}
      <div className="px-5 pt-4 pb-5 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <Avatar name="Sarah West" size={30} tone="#c47420" />
          <div className="min-w-0">
            <p className="text-[12.5px] text-white/90 truncate">Sarah West</p>
            <p className="text-[11px] text-white/45 truncate">Westerwind Kennel</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ title }) {
  return (
    <div className="h-[58px] bg-white border-b border-black/[0.06] flex items-center justify-between px-6 md:px-8 shrink-0">
      <div className="flex items-center gap-3 text-[13px] text-warm-500">
        <span>Westerwind</span>
        <span className="text-warm-300">/</span>
        <span className="text-warm-800">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-warm-100 rounded-[9px] h-9 px-3 text-[12.5px] text-warm-500 w-[260px]">
          <Glyph shape="search" color="#9a8871" size={14} />
          <span>Search clients, litters, puppies…</span>
          <span className="ml-auto font-mono text-[10.5px] text-warm-400 border border-warm-200 rounded px-1.5 py-0.5">⌘K</span>
        </div>
        <button className="w-9 h-9 rounded-[9px] hover:bg-warm-100 flex items-center justify-center relative">
          <Glyph shape="bell" color="#7a6a58" size={16} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#c47420]" />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar });
