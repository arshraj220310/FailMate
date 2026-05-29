---
name: Failmate
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#b9ccb2'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#84967e'
  outline-variant: '#3b4b37'
  surface-tint: '#00e639'
  primary: '#ebffe2'
  on-primary: '#003907'
  primary-container: '#00ff41'
  on-primary-container: '#007117'
  inverse-primary: '#006e16'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#fff8f4'
  on-tertiary: '#442b10'
  tertiary-container: '#ffd5ae'
  on-tertiary-container: '#7a5b3c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72ff70'
  primary-fixed-dim: '#00e639'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#e7bf99'
  on-tertiary-fixed: '#2c1701'
  on-tertiary-fixed-variant: '#5d4124'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1280px
---

## Brand & Style

This design system embodies the "Sleek Cyber-Graveyard" aesthetic—a high-fidelity environment built for technical post-mortems and error logging. The brand personality is clinical, precise, and intentionally gritty, catering to a developer-centric audience that finds beauty in the architecture of failure.

The visual style is a sophisticated blend of **Minimalism** and **Glassmorphism**, infused with a "terminal" influence. It prioritizes data density and legibility through a high-contrast dark interface, utilizing semi-transparent surfaces to create depth without clutter. The atmosphere is that of a secure, underground server vault: professional, high-stakes, and focused.

## Colors

The palette is anchored in **Obsidian** and **Deepest Charcoal**, providing a "true black" foundation that eliminates visual noise. 

- **Terminal Green (#00FF41):** Used exclusively for primary actions, success states, and critical data highlights. It should feel radioactive and energetic against the dark background.
- **Warning Amber (#FFB800):** Reserved for alerts, logs, and cautionary data points. 
- **Neutral Grays:** A spectrum of dark grays is used for surfaces to create a sense of layering.

All semi-transparent glass containers must utilize a subtle green-tinted border (`rgba(0, 255, 65, 0.2)`) to simulate light bleeding from the primary "Terminal" color.

## Typography

This design system utilizes a dual-font strategy to differentiate between UI orchestration and technical data.

1.  **Inter (UI/General):** A sharp, modern sans-serif used for all functional controls, navigation, and primary headlines. It provides the "professional" polish required for a sleek tool.
2.  **JetBrains Mono (Data/Code):** A technical monospaced font used for error logs, metrics, code snippets, and metadata labels. 

Headlines should remain tight with slight negative letter-spacing, while mono-spaced labels should be tracked out for a "readout" effect.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. It uses a rigorous 8px grid to maintain developer-grade precision. 

- **Desktop:** A 12-column grid with 16px gutters. Layouts are typically split into a "Status/Sidebar" (3 columns) and a "Main Feed/Log" (9 columns).
- **Mobile:** A single-column flow with 16px side margins. 
- **Density:** Spacing is kept tight (8px or 16px) between related data points to maximize information density, while larger sections are separated by 32px or 48px to allow the glass effects to breathe.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and tonal layering rather than traditional drop shadows.

- **Base Layer:** The obsidian background (#0A0A0B).
- **Glass Layers:** Semi-transparent panels with a 10px to 20px backdrop-blur. Each panel features a 1px border in a muted green or dark gray.
- **Scanlines:** A subtle, repeating horizontal texture (2px height, 5% opacity) is applied as an overlay to all glass containers to reinforce the "Terminal" aesthetic.
- **Interactive Depth:** When elements are hovered, their border opacity increases, and a subtle "inner glow" of Terminal Green is applied to simulate the screen reacting to the user.

## Shapes

The shape language is primarily **Soft (0.25rem)**. While a technical tool often leans sharp, this design system uses a subtle corner radius to maintain a "sleek" and modern software feel. 

- UI Controls (Buttons, Inputs): 4px (Soft).
- Primary Containers: 8px (Rounded-lg).
- No pill-shaped or fully round elements are used, as they conflict with the rigid, technical nature of the brand.

## Components

- **Buttons:** Primary buttons are "ghost" style with a Terminal Green border and text. On hover, they fill with solid Terminal Green and black text.
- **Chips / Tags:** Monospaced text inside small, 1px-bordered boxes. Status tags use Amber (#FFB800) for warnings and Green (#00FF41) for resolved errors.
- **Input Fields:** Styled as terminal prompts. They feature a bottom-border only or a thin glass container. The cursor is a flashing block underscore (`_`).
- **Cards (Logs):** Glass containers with a subtle scanline overlay. The top of the card includes a monospaced "timestamp" and "ID" in the top-right corner.
- **Lists:** Data-heavy rows with alternating subtle background tints (Zebra striping) for readability in long error logs.
- **Progress Indicators:** Linear "bit-style" bars that fill with Terminal Green in segments rather than a smooth gradient.