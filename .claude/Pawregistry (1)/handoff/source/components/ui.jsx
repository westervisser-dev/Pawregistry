// ─── Shared UI primitives for Pawregistry admin ───────────────────────────────

const { useState, useEffect, useRef, useMemo } = React;

// Striped image placeholder with a monospace label
function Placeholder({ label, className = '', style = {}, tone = 'warm' }) {
  const toneMap = {
    warm:  { a: '#ede5d8', b: '#e1d4c0', text: '#8a7560' },
    cream: { a: '#f5f0e8', b: '#ebe2d3', text: '#9a8871' },
    sand:  { a: '#e7dcc8', b: '#d9ccb2', text: '#7a6a58' },
    dark:  { a: '#3d2510', b: '#2a1808', text: '#d6c9b8' },
  };
  const t = toneMap[tone] || toneMap.warm;
  return (
    <div
      className={`relative overflow-hidden flex items-end ${className}`}
      style={{
        backgroundImage: `repeating-linear-gradient(135deg, ${t.a} 0, ${t.a} 14px, ${t.b} 14px, ${t.b} 28px)`,
        ...style,
      }}
    >
      <span
        className="font-mono text-[10.5px] px-2.5 py-1 m-2 rounded-sm"
        style={{ background: 'rgba(255,255,255,0.72)', color: t.text, letterSpacing: '0.02em' }}
      >
        {label}
      </span>
    </div>
  );
}

// Small rounded pill for stages/statuses
const STAGE_STYLES = {
  enquired:         { bg: '#fef3e7', fg: '#a35c17', dot: '#d98e3a', label: 'Enquired' },
  approved:         { bg: '#e8efe5', fg: '#3f5a36', dot: '#4a6741', label: 'Approved' },
  rejected:         { bg: '#f4e4e1', fg: '#883224', dot: '#a8412e', label: 'Rejected' },
  waitlisted:       { bg: '#e5ecf2', fg: '#1e5b8a', dot: '#2f78a9', label: 'Waitlisted' },
  puppy_reserved:   { bg: '#f6e5e9', fg: '#8d2a4a', dot: '#b8446a', label: 'Reserved' },
  puppy_booked:     { bg: '#e8dff0', fg: '#5a2d83', dot: '#7a47a8', label: 'Booked' },
  puppy_fully_paid: { bg: '#e4ebe0', fg: '#3e5a2a', dot: '#5a7a3f', label: 'Fully paid' },
};

function StagePill({ stage, size = 'md' }) {
  const s = STAGE_STYLES[stage] || STAGE_STYLES.enquired;
  const pad = size === 'sm' ? 'px-2 py-[3px] text-[10.5px]' : 'px-2.5 py-[4px] text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad}`}
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function DepositPill({ status, tier }) {
  if (!status || status === 'none') {
    return <span className="inline-block px-2 py-[3px] rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-500">No deposit</span>;
  }
  if (status === 'pending') {
    return <span className="inline-block px-2 py-[3px] rounded-full text-[10.5px] font-medium" style={{ background: '#fef3e7', color: '#a35c17' }}>Pending · R{tier === 'r500' ? '500' : '5,000'}</span>;
  }
  return <span className="inline-block px-2 py-[3px] rounded-full text-[10.5px] font-medium" style={{ background: '#e4ebe0', color: '#3e5a2a' }}>Paid · R{tier === 'r500' ? '500' : '5,000'}</span>;
}

// Card container matching the real app's --radius-card / --shadow-card tokens
function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`bg-white border border-black/[0.05] ${className}`}
      style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 px-[22px] pt-5 pb-3">
      <div>
        <h3 className="text-[15px] font-medium text-warm-900 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>{title}</h3>
        {subtitle && <p className="text-[12px] text-warm-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && <div className="text-[11.5px] text-warm-500 uppercase tracking-[0.14em] mb-2">{breadcrumb}</div>}
        <h1 className="font-serif text-[34px] leading-[1.05] text-warm-900">{title}</h1>
        {subtitle && <p className="text-[14px] text-warm-600 mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Primary button w/ brand amber
function Button({ children, variant = 'primary', size = 'md', icon, onClick, className = '', as = 'button', href, disabled }) {
  const variants = {
    primary:   'bg-[#c47420] hover:bg-[#a35c17] text-white',
    secondary: 'bg-white hover:bg-warm-50 text-warm-800 border border-warm-200',
    ghost:     'bg-transparent hover:bg-warm-100 text-warm-700',
    dark:      'bg-warm-900 hover:bg-warm-800 text-warm-50',
  };
  const sizes = { sm: 'h-8 px-3 text-[12.5px]', md: 'h-9 px-4 text-[13px]', lg: 'h-11 px-5 text-[14px]' };
  const cls = `inline-flex items-center gap-2 rounded-[9px] font-medium transition-colors ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;
  if (as === 'a') return <a href={href} className={cls} onClick={onClick}>{icon}{children}</a>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

// Stat tile — large number, soft icon chip, optional trend pill
function StatCard({ label, value, accent = 'brand', sub, onClick, active }) {
  const accents = {
    brand: '#c47420', green: '#4a6741', blue: '#1e5b8a', plum: '#7a47a8', rust: '#8d2a4a',
  };
  const c = accents[accent] || accents.brand;
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white border transition-all w-full`}
      style={{
        borderRadius: 14,
        borderColor: active ? c : 'rgba(0,0,0,0.06)',
        boxShadow: active ? `0 0 0 3px ${c}12` : '0 1px 3px rgba(0,0,0,0.04)',
        padding: 20,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.1em] text-warm-500 font-medium">{label}</div>
          <div className="font-serif text-[38px] leading-[1] text-warm-900 mt-2">{value}</div>
        </div>
        <span className="w-1.5 h-6 rounded-full" style={{ background: c }} />
      </div>
      {sub && <div className="text-[12px] text-warm-500 mt-3">{sub}</div>}
    </button>
  );
}

// Mini glyph (no emoji — simple geometric mark in an accent color)
function Glyph({ shape = 'dot', color = '#c47420', size = 16 }) {
  const stroke = { stroke: color, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (shape === 'paw') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <circle cx="7" cy="8" r="2" fill={color} stroke="none" />
        <circle cx="12" cy="6" r="2" fill={color} stroke="none" />
        <circle cx="17" cy="8" r="2" fill={color} stroke="none" />
        <circle cx="19.5" cy="13" r="1.6" fill={color} stroke="none" />
        <path d="M6 17c0-3 2.5-5 6-5s6 2 6 5c0 2-2 3-3 3H9c-1 0-3-1-3-3z" fill={color} stroke="none"/>
      </svg>
    );
  }
  if (shape === 'people') return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20c0-2 1-4 3-4.5"/></svg>;
  if (shape === 'coin')   return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 1.8 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2"/></svg>;
  if (shape === 'inbox')  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 13l2-7h12l2 7"/><path d="M4 13v5h16v-5"/><path d="M4 13h5l1 2h4l1-2h5"/></svg>;
  if (shape === 'doc')    return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>;
  if (shape === 'home')   return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/></svg>;
  if (shape === 'calendar') return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>;
  if (shape === 'arrow') return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  if (shape === 'grip')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.3" fill={color}/><circle cx="15" cy="6" r="1.3" fill={color}/><circle cx="9" cy="12" r="1.3" fill={color}/><circle cx="15" cy="12" r="1.3" fill={color}/><circle cx="9" cy="18" r="1.3" fill={color}/><circle cx="15" cy="18" r="1.3" fill={color}/></svg>;
  if (shape === 'search') return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>;
  if (shape === 'plus')  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14"/></svg>;
  if (shape === 'check') return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M5 12.5l4 4 10-10"/></svg>;
  if (shape === 'bell')  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 17h12l-1.5-2V11a4.5 4.5 0 00-9 0v4L6 17z"/><path d="M10 20a2 2 0 004 0"/></svg>;
  return <span className="inline-block rounded-full" style={{ width: size, height: size, background: color }} />;
}

// Avatar with initials
function Avatar({ name, size = 32, tone }) {
  const initials = (name || '?').split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase();
  const tones = ['#c47420','#4a6741','#1e5b8a','#8d2a4a','#7a47a8','#7a6a58'];
  const hash = [...(name||'x')].reduce((a,c)=>a+c.charCodeAt(0),0);
  const bg = tone || tones[hash % tones.length];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-medium shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38, letterSpacing: '0.02em' }}
    >
      {initials}
    </span>
  );
}

// Segment control (tabs)
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-warm-100 rounded-[10px] p-1 gap-1 border border-warm-200">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 h-8 rounded-[7px] text-[12.5px] font-medium transition-colors ${value === o.value ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-600 hover:text-warm-800'}`}
        >
          {o.label}{typeof o.count === 'number' && <span className="ml-1.5 text-warm-400 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, {
  Placeholder, StagePill, DepositPill, Card, CardHeader, PageHeader, Button,
  StatCard, Glyph, Avatar, Segmented, STAGE_STYLES,
});
