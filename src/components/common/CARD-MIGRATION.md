# Card Migration Matrix

Phase 2 plan for migrating legacy card families onto the global primitives
`StatCard` / `RecordCard` defined alongside this file.

- **Phase 1** (complete): `StatCard.jsx`, `RecordCard.jsx`, `../../theme/card-tokens.css`.
- **Phase 2** (this document): migrate existing consumers, page by page.
- **Batches are never mass replacements.** Every family is inspected individually.

## How a family is classified

| Verdict | Meaning |
| --- | --- |
| `READY` | Structure and colour model both map to a primitive. Safe to migrate. |
| `NEEDS DECISION` | A design choice is required that has not been approved yet. |
| `KEEP` | Specialized behaviour that a primitive must not absorb. |

Two independent axes are checked for every family, because they fail
independently and a family can be clean on one and unusable on the other:

1. **CSS coupling** — is the family's appearance driven by global
   `html.role-theme` / `html.light` tier rules carrying `!important`?
2. **API fit** — does the family's own structure and colour model survive the
   primitive's props, or does it need custom slots/tokens?

## Batch 1: `.ov-stat` — MIGRATED

**Consumer:** `pages/Resident/ResidentOverview.jsx` (3 tiles, 1 page).

The local `StatTile` wrapper was deleted and the three tiles now render
`<StatCard layout="inline">` directly.

| Was | Now |
| --- | --- |
| `tone="#3B82F6"` | `tone="info"` |
| `tone="#10B981"` | `tone="success"` |
| `tone="#F59E0B"` | `tone="warning"` |
| `style={{ "--tone": tone }}` | tone modifier class |

Coupling was already clean (2 rules, 0 tier-gated, 0 `!important`), the card was
not clickable so there was no nested-interactive risk, and it was the smallest
blast radius in the inventory.

**Primitive change this batch required.** `.ov-stat` is horizontal (icon leading
edge, value above label to its right) while `StatCard` was vertical with a
corner icon. A `layout="inline"` variant was added rather than accepting the
layout change on two resident-facing routes. It is implemented as a two-column
grid, so the DOM stays flat and no wrapper element was introduced.

Approved visual deltas — the card now participates in the shared tone system
rather than carrying a fixed palette:

- background: flat `var(--card-bg)` → `var(--card-bg)` with a 10% tone tint
- border: `var(--glass-border)` → tone-tinted border
- icon chip: `color-mix(tone 14%)` → the shared 10% tone tint
- the three fixed hexes are now theme-aware and shift with role/society theme

Everything structural is preserved: 18px padding, 16px radius, 14px gap,
44px/14px-radius/21px icon, 1.7rem value, 0.74rem/600 sentence-case label
(the stacked layout uses an uppercase caption, so `inline` opts out), −2px
hover lift, and the `.ov-stats` grid container including its one-column
collapse under `html.role-theme`.

`.ov-stat`, `.ov-stat:hover`, `.ov-stat__icon`, `.ov-stat__val` and
`.ov-stat__label` were removed from `Resident.css` **after** confirming zero
remaining consumers. `.ov-stats` was kept because it is still the container.

The `≤1023px` / `≤639px` size reductions in `StatCard.css` are scoped to exclude
`layout="inline"`, because `.ov-stat` never shrank its type or icon.

### The two candidates that were rejected in this batch

### `.ad-kpi` — IN PROGRESS (batch 2A, `/admin` migrated)

- **Consumers: 8 files.** `Admin/Accounting.jsx`, `Admin/AdminDashboard.jsx`,
  `Admin/AdminEmergency.jsx`, `Guard/GuardCollection.jsx`,
  `Guard/GuardDashboard.jsx`, `Guard/VisitorLogScreen.jsx`,
  `Resident/MyCollection.jsx`, `SuperAdmin/SuperAdminDashboard.jsx`.
- **CSS coupling: total.** ~273 rules, extensively `!important` and tier-gated.

The `.dash-kpi-scope` wrapper is **not** what couples these cards. The real
coupling is global tier rules that no ancestor gates:

```
theme/role-theme.css:2306  html.role-theme:not(.light) .ad-kpi--total  { border-color: … !important }
theme/role-theme.css:2351  html.light.role-theme   .ad-kpi--total      { background: … !important; border: none !important }
```

`.dash-kpi-scope` appears in 8 files, 5 of which contain `.ad-kpi`. The other 3
consumers are **equally coupled** and render identically, so they are not a
safer entry point.

Two consequences block a parity migration:

1. **Light role theme changes shape.** Today a light role card is a full-bleed
   saturated gradient with `border: none !important`. `StatCard` is a 10%
   `color-mix` tint with a 1px border. That is a redesign, not a migration.
2. **`--stat-amber-bg` and `--stat-red-bg` are swapped in every tier.** In the
   light role theme `--stat-red-bg` is `linear-gradient(135deg,#9e58ff,#a05aff)`
   — purple — so `.ad-kpi--cancelled` currently paints **purple** while its
   border is red. `index.css:248` additionally gives `--stat-amber-bg` a blue
   tint. Mapping `--cancelled` to `tone="danger"` would silently repaint it red.

Dark role theme is the one clean case: `total`→`brand`, `expected`→`info`,
`gate`→`warning`, `collected`→`success` all resolve to the identical colour.

**Decision taken:** proceed with the migration. The historical `.ad-kpi`
colours are explicitly *not* reproduced; the cards move onto the semantic,
theme-aware token system while preserving meaning and structure.

#### Batch 2A — `/admin` migrated

`Admin/AdminDashboard.jsx`, 4 cards, `variant="sheen"` on all of them.

**A correction to the earlier analysis in this document.** The palette inside
`.dash-kpi-scope` is not the shared one. `role-theme.css:2440-2450` gives the
scoped cards a different four-colour set:

| Card | scoped `.ad-kpi-label` | tone chosen |
| --- | --- | --- |
| Residents | `#22d3ee` cyan | `brand` |
| Guards | `#3b82f6` blue | `success` |
| Open Complaints | `#fb7185` pink | `warning` |
| Total Flats | `#a78bfa` lavender | `info` |

The earlier shared-palette reading (purple / green / cyan / red) applies to the
non-scoped consumers only. Both palettes are `!important`, and the scoped one
wins on `/admin`.

`variant="sheen"` on all four because `.dash-kpi-scope` applied both the
`::before` corner blob and the `::after` shine to every card it contained.

Preserved unchanged: values, labels, descriptions, `isCommittee` branch,
`navigate("/admin/complaints")`, and the grid. The descriptions keep their
original `hidden lg:block` wrapper, passed as a `description` element, so
below-lg visibility is identical. The clickable card now renders a real
`<button type="button">` instead of a `div` with `onClick`, and its
`style={{ cursor: "pointer" }}` was dropped as redundant.

The `dash-kpi-scope` wrapper is left in place — its descendant rules are now
inert on this page but its Tailwind layout classes still apply, and the page
layout was explicitly out of scope.

**Remaining `.ad-kpi` consumers: 7 files.** `Accounting.jsx` (68 refs),
`AdminEmergency.jsx` (16), `GuardDashboard.jsx` (16), `VisitorLogScreen.jsx`
(15), `SuperAdminDashboard.jsx` (8), `GuardCollection.jsx` (4),
`MyCollection.jsx` (3).

`.ad-kpi` CSS is **not** removed: the zero-consumer gate is not met.

### `.sd-stat` — REJECTED (fit mismatch)

- **Consumer: 1 file**, `components/super-admin/SocietyDetailModal.jsx`.
- **CSS coupling: none.** 8 rules in `SuperAdmin.css`, 0 `!important`, 0
  tier-gated. Clean on axis 1.
- **API fit: fails on both counts.**
  - **25 `Tile` usages carry 14 distinct hardcoded hexes** — `#9F87D7`,
    `#22C55E`, `#3b82f6`, `#fb7185`, `#f59e0b`, `#a78bfa`, `#2FC27E`, `#f472b6`,
    `#22d3ee`, `#ef4444`, `#6d28d9`, `#5B8DEF`, `#22c55e`, `var(--accent)`.
    Six semantic tones cannot reproduce 14 arbitrary colours.
  - **Structure differs.** `Tile` renders icon chip + label in one row
    (`.sd-stat-row`), *then* the value. `StatCard` renders value first, then
    label, with the icon in the top-right corner.

This is a compact metric tile with a bespoke palette, not a dashboard KPI.

### `.mcard` — REJECTED (nested interactive content)

- **Consumer: 1 file**, `sections/complaint/index/ComplaintCard.jsx`.
- **CSS coupling: none.** 2 rules in `Complaint.module.css`, 0 `!important`,
  0 tier-gated. Structurally it is the closest match in the inventory: shell,
  title + inline icon, 2-line clamped description, meta row, image slot,
  footer actions all map 1:1 onto `RecordCard` slots.
- **API fit: fails.** The card embeds an `InteractiveMenu` carrying
  `role="menu"` and four nested `<button>`s (`:58-96`), plus a footer chat
  `<button>` (`:265-301`), both relying on `stopPropagation`.

Passing `onClick` to `RecordCard` promotes the shell to a `<button>` and nests
buttons inside a button — invalid HTML. The `as="div"` + `role="button"` escape
hatch avoids invalid HTML but is worse for assistive tech than today's plain
`<div>`, so it is not a net accessibility gain.

## Full inventory

| Family | Consumers | CSS coupling | Verdict |
| --- | --- | --- | --- |
| `.ad-kpi` | 8 files → **7 remaining** | ~273 rules, heavy `!important` + tier | IN PROGRESS (2A: `/admin` done) |
| `.stat-card` | 29 files | 101 rules, 70 tier-gated (`index.css`, `role-theme.css`) | NEEDS DECISION |
| `.complaint-stat-card` | 17 files | 33 rules, 19 tier-gated (4 files) | NEEDS DECISION |
| `.sd-stat` | 1 file | clean | REJECTED (fit) |
| `.ov-stat` | 0 — migrated in batch 1 | `.ov-stat*` removed from `Resident.css` | MIGRATED |
| `.cs-kpi` | 1 file (`cleaning-staff/index/Index.jsx`) | `CleaningStaff.css` only, 0 tier-gated, 0 `!important`; uses `--cs-kpi-accent` inline per-instance (14+ arbitrary colours) | KEEP — per-instance palette is not mappable to 6 semantic tones |
| `.doc-decent-card` | 1 file (`sections/document/index/Index.jsx`) | `Document.css` only, 0 `!important`, 0 tier-gated, scoped to `.documents-page` | KEEP — category `data-attr` colour model, blob animation, hover shimmer; specialty content card |
| `.mcard` | 1 file | clean | REJECTED (nested interactive) |
| `.complaint-card` | **0 files** — **PURGED** 2026-10-02 | removed from `index.css` (base + responsive blocks) | DEAD — removed |
| `.sa-kpi-card` | **0 files** — **PURGED** 2026-10-02 | removed from `SuperAdmin.css` (base + tier blocks) and `role-theme.css` (selector lists) | DEAD — removed |
| `.gd-stat-card` | **0 files** — **PURGED** 2026-10-02 | removed from `Guard.css` (tier block), `index.css` (base + responsive), and `role-theme.css` (selector lists) | DEAD — removed |
| `.ps-decent-card` | 1 file (`Admin/AssignParkingSlot.jsx`) | `role-theme.css` lines 2660-2676, scoped tier rules | KEEP — `available`/`occupied` state card; not a generic primitive |
| `.ra-card` | 1 file (`Resident/ResidentAmenity.jsx`) | `Resident.css` with `html.role-theme .ra-card` rules | KEEP — amenity selection card with emoji, accent bar, disabled opacity; specialty UI |
| `.fh-flat-card` | 1 file (`Admin/FlatHistory.jsx`) | `Admin.css` with deeply scoped tier rules + `light.css` overrides | KEEP — flat selection card with resident/vacant strip and selection state |
| `.adh-op` | 1 file (`Admin/AdminDashboard.jsx:315-365`) | 11 rules in `Admin.css`, **all 11 tier-gated** | NEEDS DECISION — same `--stat-*` gradient exposure as `.ad-kpi`, same page |
| `.premium-card` | 2 files (`Accountant/*`) | — | KEEP per Phase 2 scope |
| `.sa-action-menu` | 1 file | — | KEEP per Phase 2 scope |
| chart / table / inner cards | various | — | KEEP per Phase 2 scope |

## Rules for every batch

- Migrate page by page. Never `sed` a class name across the repo.
- Existing card CSS is removed **only** once its last consumer is gone.
- No API calls, routes, permissions, translations or `localStorage` behaviour change.
- No concurrent external edits are reverted or cleaned up.
- Broken legacy selectors are reported, not repaired, inside a migration batch.