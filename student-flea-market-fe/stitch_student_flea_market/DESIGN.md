---
name: Student Flea Market
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e4e2e2'
  on-secondary-container: '#646464'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c1c'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
  price-numeral:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies hyper-clean minimalism engineered for rapid peer-to-peer student transactions. The identity balances the utilitarian clarity of an academic workspace with the kinetic energy of an urban flea market. Visual noise is stripped away to spotlight student-generated listings, item condition details, and transparent price tags.

The aesthetic fuses Japanese minimal editorial layout with high-precision Swiss grid discipline:
- **Core Stance:** Monochrome high-contrast architecture, absolute pure white canvases, and surgical thin-line dividers.
- **Atmosphere:** Direct, democratic, unpretentious, yet premium. The product feels like a curated catalog rather than a cluttered classifieds forum.
- **Physicality:** Tactile island components floating gently over pure negative space, anchored by crisp structural borders and micro-spring responses on direct input.

## Colors

The color architecture is radically monochromatic, leveraging absolute value stops rather than tinted chromatic tones.

- **Primary (`#000000`):** Pitch black used for definitive structural strokes, primary call-to-action buttons, high-priority pricing numerals, and primary headers.
- **Secondary (`#525252`):** Deep graphite for secondary actions, supporting metadata, categorical badges, and verified seller markers.
- **Tertiary (`#8A8A8A`):** Mid-tone muted silver for inactive states, placeholder text, secondary icons, and structural hairline dividers (`#E5E5E5`).
- **Neutral Canvas (`#FFFFFF` & `#FAFAFA`):** The primary view surface is uncompromising `#FFFFFF`. Layer 1 island cards utilize `#FAFAFA` or translucent white fills (`rgba(255, 255, 255, 0.85)`) to delineate space without introducing shadow contamination.
- **Semantic Signals:** Success (sold/reserved items), alerts, and urgent trade notifications are rendered in stark grayscale variants with solid shape iconography, reserving micro-accents of high-visibility amber or emerald strictly for transactional verification tags.

## Typography

The typography pairs Plus Jakarta Sans for structural display/numerals with Inter for dense listings, descriptions, and metadata. Both fonts feature full Latin Extended support, ensuring diacritic positioning for Vietnamese tone marks (dấu hỏi, ngã, nặng, sắc, huyền) without baseline clipping or unbalanced line heights.

- **Numerals & Currency:** Listing prices utilize `price-numeral` set in Plus Jakarta Sans with tabular lining figures (`font-variant-numeric: tabular-nums`) to align prices across comparison rows and flea-market grids.
- **Editorial Contrast:** Headings emphasize extreme weight contrast (ExtraBold 800 down to Regular 400), creating scannable card hierarchies without resorting to multiple colors.

## Layout & Spacing

The layout is built upon an 8pt modular system configured within a fluid-responsive grid:

- **Desktop (12 Columns):** Max canvas width capped at 1320px with centered margin offset. Listings align to 3-column or 4-column modules. Gutters are locked to `gutter-desktop` (1.5rem / 24px).
- **Tablet (8 Columns):** Fluid margin (`margin-tablet` / 32px), with 2-column or 3-column listing grids.
- **Mobile (4 Columns):** Dense 2-column flea market browsing grid with 8px gaps or single-column detail feeds, constrained by a strict `margin` (1rem / 16px).

### Motion & Transitions
Transitions honor physical tactile inertia. Interface objects react via cubic bezier curves:
- **Default Motion:** `cubic-bezier(0.16, 1, 0.3, 1)` (snappy spring out, 250ms).
- **Press States:** Micro-scale down to `scale(0.98)` with a 100ms ease-out response.

## Elevation & Depth

This system avoids heavy drop shadows, instead creating depth through **tactile physical layering, crisp hairline borders, and glassmorphic island surfaces**.

1. **Flat Base (Level 0):** Pure `#FFFFFF` background with 0px elevation.
2. **Tactile Island Cards (Level 1):** Solid `#FFFFFF` or frosted acrylic surfaces (`backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.88)`). Delimited by a precise 1px border (`#E5E5E5`). Upon hover, cards lift subtly with a whisper-ambient shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.04)`.
3. **Floating Floating Action Elements & Headers (Level 2):** Sticky bottom negotiation bars and navigation islands hover with backdrop blurs, bounded by crisp `#D4D4D4` lines and an ambient ground shadow: `0 12px 32px -8px rgba(0, 0, 0, 0.08)`.
4. **Modals & Drawers (Level 3):** Strict solid white panels backed by a 40% translucent graphite scrim (`rgba(0, 0, 0, 0.4)`).

## Shapes

The geometric framework is defined by disciplined, modern radii (Level 2):

- **Default Component Elements:** Standard controls (inputs, chips, select menus) use `0.5rem` (8px).
- **Cards & Floating Islands:** Listing cards, filter islands, and modal sheets use `rounded-lg` (`1rem` / 16px).
- **Interactive Micro-Triggers:** Quick-filters, pill badges, and primary action chips utilize full-radius capsules (`rounded-full` / 9999px) to contrast against rectangular content cards.
- **Media Assets:** Product photography thumbnails maintain a uniform 8px inner corner radius with an inset 1px outline (`inset 0 0 0 1px rgba(0,0,0,0.06)`).

## Components

### Buttons
- **Primary:** Solid `#000000` fill, `#FFFFFF` text, `0.5rem` corner radius. Interactive state: scale down to 0.98 on active press, hover state lifts to `#1F1F1F`.
- **Secondary / Outline:** `#FFFFFF` background, crisp 1px `#E5E5E5` border, `#000000` text. Hover shifts border to `#000000`.
- **Ghost:** Borderless, `#525252` text, `#FAFAFA` hover fill.

### Cards (Marketplace Islands)
- Built with a 1px solid border (`#EAEAEA`) on white canvas.
- Photo container at standard 1:1 or 4:3 ratio with lazy-loaded low-contrast skeletons.
- Bottom details area: Title (`body-md`), student campus verification badge, and bold standout price (`price-numeral`).
- Hover triggers subtle card lift with `cubic-bezier(0.16, 1, 0.3, 1)`.

### Chips & Badges
- **Category & Campus Chips:** Pill-shaped capsules (`rounded-full`), 1px `#E5E5E5` stroke, 12px horizontal padding.
- **Condition Tags:** Muted graphite pill (`#F5F5F5` background, `#262626` text, e.g., "Như mới 99%", "Hết bảo hành").

### Input Fields
- White background, 1px `#E5E5E5` perimeter border, 12px vertical by 16px horizontal padding.
- Focus state: Border instantly shifts to `#000000` with 0px glow or ring artifacts—pure crisp graphic clarity.
- Search input includes student campus quick-filter attachments.

### Checkboxes & Radio Buttons
- Custom 18px geometry with 1.5px `#000000` stroke.
- Checked state: High-contrast black fill with an inverse white micro-check icon.
- Radios: Circular ring with solid inset black center dot (4px clearance).

### Marketplace Specialized Components
- **Bargain Slider / Offer Island:** Interactive bid sheet with quick tap buttons (`-10k`, `-20k`, `-50k`) styled with crisp outlines.
- **Campus Exchange Verification Bar:** A compact identity badge anchoring buyer and seller dorm/campus locations with monospaced route indicators.