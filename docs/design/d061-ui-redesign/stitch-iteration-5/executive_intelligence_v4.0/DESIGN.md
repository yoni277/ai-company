---
name: Executive Intelligence v4.0
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The brand personality is authoritative yet understated, designed for high-stakes decision-making environments. It prioritizes clarity, speed of cognition, and a sense of "quiet premium." 

The visual style is **Corporate / Modern**, leaning heavily into **Minimalism**. It draws inspiration from the precision of Linear, the document-centric clarity of Notion, and the refined polish of Apple. The interface should feel like a high-end physical tool—precise, reliable, and functional.

**Core Principles:**
- **Executive Calm:** Massive whitespace and a reduction of visual noise to prevent cognitive overload.
- **Precision:** Perfect alignment and consistent mathematical scaling.
- **Operational Clarity:** Clear distinction between "Operate" (viewing/interacting) and "Build" (configuring/editing) modes via subtle chrome changes.

## Colors
The palette is rooted in a professional "Intelligence Blue" set against a sophisticated slate-wash background.

- **Primary (#2563EB):** Used for primary actions, focus states, and active selection.
- **Background (#F8FAFC):** A cool, off-white that reduces eye strain compared to pure #FFFFFF.
- **Neutrals:** A scale of Slates (64748B to 0F172A) is used for text and borders to maintain a "Linear" aesthetic.
- **Health States:** Mandatory semantic colors for executive reporting.
    - **Healthy:** Emerald 600.
    - **Needs Attention:** Amber 500.
    - **Action Required:** Red 600.
- **Contrast:** All text/background combinations must exceed a 4.5:1 ratio (WCAG-AA).

## Typography
The system uses **Inter** for all UI and content to ensure maximum legibility and a modern, neutral feel. **JetBrains Mono** is introduced specifically for metadata, data annotations (e.g., `DATA: HAVE`), and technical identifiers to provide a "built-in" tool aesthetic.

For Hebrew (RTL) support, ensure font-feature settings are optimized for readability. The type scale is strictly controlled to maintain executive hierarchy; use weight (600) for emphasis rather than color changes.

## Layout & Spacing
The layout uses a **Fixed Grid** for content areas to maintain a "document" feel, centered within a fluid viewport.

- **Grid:** 12-column system with 24px gutters for desktop.
- **RTL Support:** Use CSS Logical Properties (`padding-inline-start` instead of `padding-left`) to automatically support English and Hebrew without duplicate stylesheets.
- **Modes:** 
    - **Operate Mode:** Clean, focused, sidebars collapsed by default.
    - **Build Mode:** Features a persistent "Utility Panel" (320px) on the end side (right in LTR, left in RTL) for configuration.
- **Touch Targets:** All interactive elements must maintain a minimum 44x44px hit area, even if the visual representation is smaller.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Low-contrast outlines** rather than heavy shadows.

- **Base Layer:** #F8FAFC (The canvas).
- **Surface Layer:** #FFFFFF (Cards, Modals, Popovers).
- **Stroke:** 1px solid #E2E8F0. In "Build Mode," strokes can become dashed to indicate editable regions.
- **Shadows:** Use a single, highly diffused "Ambient Shadow" for elevated surfaces: `0 4px 12px rgba(0, 0, 0, 0.03)`.
- **Focus States:** A 2px #2563EB ring with a 2px offset for accessibility.

## Shapes
A **Soft** approach is used to balance modern aesthetics with professional rigor.
- **Standard UI (Buttons, Inputs):** 0.25rem (4px) corner radius.
- **Containers (Cards, Sections):** 0.5rem (8px) corner radius.
- **Outer Shells (Modals):** 0.75rem (12px) corner radius.
This subtle rounding avoids the "bubbly" look of consumer apps while remaining more approachable than hard 90-degree angles.

## Components
- **Health Indicators:** Must always follow the triad: `[Icon] [Status Text] [Label]`. Use a solid 8px circle icon. Example: `🟢 Healthy: System Core`.
- **Data Annotations:** Styled as "Micro-Tags" using JetBrains Mono.
    - `DATA: HAVE`: Blue background tint / Blue text.
    - `DATA: DERIVED`: Purple background tint / Purple text.
    - `DATA: NEEDS NEW FIELD`: Orange background tint / Orange text.
    - `DATA: NEEDS NEW SERVICE`: Red background tint / Red text.
- **Buttons:**
    - **Primary:** Solid #2563EB, White text, 4px radius.
    - **Secondary:** White fill, 1px #E2E8F0 border, Slate 900 text.
- **Inputs:** Height of 40px. Use logical padding for RTL support. Placeholder text in Slate 400.
- **Cards:** White background, 1px border (#E2E8F0), no shadow unless hovered.
- **Segmented Control:** Used to toggle between "Operate" and "Build" modes; tactile feel with a subtle sliding background.