# Trackiyo DS — reusable kinetic design system

Theme-aware design language. **Layer A** (in `ds/tokens.css` + `ds/ui.tsx`) is the
shared visual language. **Layer B** (the existing `--t-*` tokens in `index.css`
+ `theme/themes.ts`) is per-theme color truth. Components consume only `--ds-*`
aliases, so they render correctly in every theme without code changes.

## Token map (Layer A → Layer B)

| Semantic (`--ds-*`)        | Resolves to       | Notes                              |
| -------------------------- | ----------------- | ---------------------------------- |
| `background`               | `--t-bg`          | App background                     |
| `foreground`               | `--t-fg`          | Primary text                       |
| `surface` / `surface-elevated` / `surface-muted` | `--t-surface` / `--t-elevated` / `--t-surface-secondary` | Layered surfaces, never pure black cards |
| `primary` / `primary-foreground` | `--t-accent` / `--t-accent-ink` | Brand action color (acid yellow is just the kinetic theme's accent) |
| `muted-foreground` / `body-text` | `--t-muted` / `--t-secondary-text` | Secondary + body text |
| `border` / `border-subtle` / `border-strong` | `--t-border` / `--t-border-subtle` / `--t-fg` | 1px / subtle / strong |
| `success` `warning` `danger` `info` | `--t-*` equivalents | Status only, not decoration |
| `focus` / `selection`      | `--t-accent`      | Focus ring + text selection        |

Existing themes were NOT changed: all 10 themes × light/dark (`modern`,
`ocean`, `forest`, `sunset`, `royal`, `rose`, `monochrome`, `amber`, `cyber`,
`kinetic`) flow through the same aliases. A future branded theme only needs to
define the `--t-*` set.

## Configuration (extends the theme store, never replaces it)

```jsx
<DesignSystemProvider
  motion="standard"      // none | subtle | standard | kinetic
  density="comfortable"  // compact | comfortable | spacious
  intensity="balanced"   // minimal | balanced | bold | kinetic
  depth="flat"           // flat | hard-shadow | soft-shadow
>
```

Nested providers merge. OS `prefers-reduced-motion` always wins (motion → none:
marquees render static, entrances disabled).

Recommended per surface: landing `kinetic/spacious`, dashboard
`bold/comfortable`, analytics `balanced/comfortable`, settings `subtle`,
forms `subtle/compact`.

## Components (`ds/ui.tsx`)

`Button` (primary/secondary/outline/ghost/danger), `IconButton`, `Card`
(default/accent/muted/outline/flat/kinetic), `Badge`
(neutral/accent/success/warning/danger/info), `DisplayText`
(display/hero/h1/h2/h3, fluid `clamp()`), `Kicker`, `SectionHeader`,
`PageHeader`, `Divider`, `Progress`, `Marquee`
(`speed` slow/medium/fast, `direction`, `pauseOnHover`, static fallback),
`AnimatedNumber` (rAF, motion-aware), layout primitives
`Container`/`Stack`/`Cluster`/`Section` (gap follows density).

Rules: no hex literals in components, no `DarkButton`-style duplicates, 44px
minimum touch targets, visible focus via global `:focus-visible`.

## Reuse in another project

1. Copy `src/ds/` (tokens.css, DesignSystemProvider, ui).
2. Define that project's `--t-*` tokens (any palette).
3. Wrap the app in `DesignSystemProvider` with chosen motion/density/intensity.
4. Use the components — they adapt automatically.
