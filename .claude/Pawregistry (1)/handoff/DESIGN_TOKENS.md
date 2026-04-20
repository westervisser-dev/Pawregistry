# Design Tokens

Match these against `client/src/index.css`. If the existing token name matches a value, **use the existing token** — do not add new ones.

## Color palette

### Brand (amber)
Used for primary CTAs, active nav, focus states, progress bars.

| Name | Hex | Usage |
|---|---|---|
| `brand-50`  | `#fdf6ee` | background tints, hero washes |
| `brand-100` | `#f8e8d0` | selection highlights, pill bg |
| `brand-200` | `#f0cfa0` | gradient mid, borders |
| `brand-400` | `#d98e3a` | gradient start for progress |
| `brand-500` | `#c47420` | **primary** — buttons, links, accent |
| `brand-600` | `#a35c17` | button hover |
| `brand-700` | `#824614` | warning text on warm bg |

### Warm neutrals
The entire UI sits on these — text, borders, surfaces.

| Name | Hex | Usage |
|---|---|---|
| `warm-50`  | `#faf8f5` | soft ivory surface |
| `warm-100` | `#f5f0e8` | **app canvas** (body bg) |
| `warm-200` | `#ede5d8` | subtle borders, dividers |
| `warm-300` | `#d6c9b8` | scrollbar, heavier dividers |
| `warm-400` | `#b5a090` | muted text, icons |
| `warm-500` | `#9e8b78` | secondary text |
| `warm-600` | `#7a6a58` | tertiary labels |
| `warm-700` | `#5a3e28` | emphasis text |
| `warm-900` | `#1e0e04` | **primary text** |

### Semantic accents
Used sparingly — status only.

| Purpose | Fg | Bg |
|---|---|---|
| Success (paid, signed) | `#3e5a2a` | `#e4ebe0` |
| Pending / action | `#a35c17` | `#fef3e7` |
| Info | `#1e5b8a` | `#e0ecf5` |

### Admin sidebar
Dark charcoal only in admin — do not use in portal.
- bg: `#2a2520`
- text: `#f5f0e8`
- active item bg: `rgba(196, 116, 32, 0.15)`

## Typography

```css
--font-sans:  "DM Sans", ui-sans-serif, system-ui, sans-serif;
--font-serif: "DM Serif Display", ui-serif, Georgia, serif;
```

Headings (`h1, h2, h3`) use `--font-serif` at `font-weight: 400`, `letter-spacing: 0`.
Body uses `--font-sans` at `letter-spacing: -0.005em`, `-webkit-font-smoothing: antialiased`.

### Type scale (rough)
| Use | Size | Family |
|---|---|---|
| Page H1 (admin) | 28–32px | serif |
| Page H1 (portal mobile / desktop) | 30px / 38–40px | serif |
| Card title | 14px medium | sans |
| Label eyebrow | 10.5–11px uppercase, `0.14em` tracking | sans |
| Body | 13–14px | sans |
| Metric | 24–56px | serif |
| Caption | 11–12px | sans |

## Shape & elevation

- Card radius: **14px** (standard), **16px** (hero / large), **10px** (inline)
- Button radius: **9–10px**
- Pill radius: **999px**
- Card border: `1px solid rgba(0,0,0,0.05)`
- Card shadow (rest): none or `0 1px 2px rgba(0,0,0,0.02)`
- Card shadow (hover): `0 6px 20px rgba(0,0,0,0.06)`

## Primitives (in `source/components/ui.jsx`)

Port these as React components in `client/src/components/ui/`:

| Primitive | Props |
|---|---|
| `Placeholder` | `label, tone: 'warm'\|'dark', className` — striped image fallback |
| `Card` | `padding, className` — white bg, warm border, 14px radius |
| `CardHeader` | `title, subtitle, action` |
| `Button` | `variant: 'primary'\|'secondary'\|'ghost', size, icon, onClick` |
| `Glyph` | `shape: 'paw'\|'coin'\|'doc'\|'home'\|'check'\|'bell'...`, `color, size` |
| `Avatar` | `name, size, tone` — initials-based |
| `StagePill` | `stage` — renders correct color for 6 lifecycle stages |
| `DepositPill` | `status: 'paid'\|'pending'\|'none'` |

Pull the actual SVG paths and color logic from `source/components/ui.jsx` — all inline, no external icon library.

## Lifecycle stages (exactly 6 + rejected)

`enquired → approved → waitlisted → puppy_reserved → puppy_booked → puppy_fully_paid`
Plus: `rejected` (off the happy path)

The `StageTracker` component in the admin client-detail and the `PortalJourney` in the portal dashboard both render this 6-step progression — the current index is `client.stage`, done = everything left of it, active = current.
