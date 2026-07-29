# CallMind Workspace Style Guidelines

These are the official UI, UX, and style guidelines for the CallMind codebase. All AI agents and developers must strictly adhere to these rules when creating or modifying any components, pages, or layout elements.

---

## 🎨 Color Palette (Theme Config)

Always use these semantic colors defined in the theme context (`src/index.css`). **Never hardcode arbitrary hex colors**; use the corresponding Tailwind utility classes:

| Color Variable | Hex Value | Tailwind Class Equivalent | Purpose |
| :--- | :--- | :--- | :--- |
| `--color-brand-50` | `#eff6ff` | `bg-brand-50` | Light backgrounds / avatars |
| `--color-brand-100` | `#dbeafe` | `bg-brand-100` | Sub-element border lines |
| `--color-brand-200` | `#bfdbfe` | `bg-brand-200` | High-contrast details |
| `--color-brand-500` | `#3b82f6` | `bg-brand-500` | Primary brand accent color |
| `--color-brand-600` | `#2563eb` | `bg-brand-600` | Main buttons / active elements |
| `--color-brand-700` | `#1d4ed8` | `bg-brand-700` | Active state hover / focus |
| `--color-slate-950` | `#0f172a` | `bg-slate-950` | Main dark background |
| `--color-success-green` | `#10b981` | `text-emerald-500` | Status Success (Completed/Active) |
| `--color-ai-purple` | `#8b5cf6` | `text-violet-500` | AI features / Insights |
| `--color-info-teal` | `#06b6d4` | `text-cyan-500` | Info logs / details |
| `--color-warning-orange` | `#f59e0b` | `text-amber-500` | Pending states / warnings |
| `--color-danger-red` | `#ef4444` | `text-red-500` | Destructive actions / Sign Out |

---

## ✍️ Typography Standards

CallMind uses two main font families:
1. **Sans Font (Body Text)**: `"Inter", ui-sans-serif, system-ui`.
   - Used for tables, settings, lists, paragraphs, and descriptions.
   - Clean, highly legible, professional weights.
2. **Display Font (Headers)**: `"Outfit", ui-sans-serif, system-ui`.
   - Used for primary titles, report summaries, and section headers.
   - Often styled with `font-black uppercase tracking-tighter italic` for premium identity.

---

## ✨ Glassmorphism & UI Utilities

CallMind features a modern, clean light-themed UI utilizing glassmorphic surfaces. Use these utility classes for cards and buttons:

1. **`.glass`**:
   - `background: rgba(255, 255, 255, 0.65)` with backdrop blur `16px`.
   - Thin translucent border and subtle shadow.
   - Ideal for headers, navigation drawers, and floating panels.
2. **`.glass-card`**:
   - `background: rgba(255, 255, 255, 0.45)` with backdrop blur `20px`.
   - Smooth hover scaling transition and enhanced floating drop shadow.
   - Used for KPI stats widgets and report container cells.
3. **`.btn-glow`**:
   - Gives brand blue buttons a shadow effect.
4. **`.btn-tactile`**:
   - Applies interactive click transition: scale down to `0.97` on click, scale up to `1.01` on hover.

---

## 🚫 Style Constraints (Mismatches)

- **Light Mode Consistency**: The core dashboard layout is light-themed (gray backgrounds, white panels). **Do not inject dark-mode panels or dark headers** unless explicitly requested. Popup drawers, flyouts, and modals must use clean white or translucent backdrops (`bg-white/95`) with gray borders (`border-gray-150`).
- **Icons Placement**: Standard navigation, settings, audit logs, and session controls belong directly in the sidebar or the header workspace lists. Do not hide them inside interactive sub-menus unless specifically asked.
- **Scrollbar Control**: Add the `.custom-scrollbar` class to scrollable lists to keep scrollbars thin (4px) and modern.
