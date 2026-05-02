# AGENTS.md — Sidebar Project Guide for AI Agents

This file is the authoritative reference for any AI agent (Claude, Copilot, etc.) working on this codebase. Read it fully before making any changes.

---

## What this project is

A custom Hyprland control-center sidebar built with **AGS v3.1.2** (Astal + GTK4 + TypeScript JSX). It runs as a persistent Wayland layer-shell surface, toggled via IPC from a keybind or Waybar.

Stack: AGS (gnim reactive system) · GTK4 · TypeScript · wlr-layer-shell · MPRIS

---

## Project layout

```
sidebar/
├── app.ts                  # Entry: IPC handler, CSS path, window bootstrap
├── style.css               # All GTK4 CSS — palette vars + every component
├── toggle.sh               # Start-or-toggle script (called by Waybar / keybind)
├── tsconfig.json           # Paths to system AGS at /usr/share/ags/js/
└── widget/
    ├── Sidebar.tsx         # Root window, layout, close button
    ├── MediaWidget.tsx     # MPRIS album art + controls
    ├── KeybindsPanel.tsx   # Collapsible keybinds cheatsheet with live search
    ├── WallpaperButton.tsx # Launches waypaper
    └── ThemeButton.tsx     # Launches ML4W theme switcher
```

---

## AGS v3 — critical API facts

This is **not** AGS v1/v2. The API is completely different. Getting these wrong produces silent runtime errors or broken reactivity.

### Import paths

```typescript
import App from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createState, createBinding, createComputed, With, For } from "ags"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"
```

**Never use** `"astal"`, `"astal/gtk4"`, `@aylur/ags`, or the v1/v2 `Variable`/`bind` API. They do not exist in this install.

### Reactivity (gnim)

```typescript
const [value, setValue] = createState<T>(initial)  // reactive state
const binding = createBinding(gobject, "propName")   // GObject notify binding
const computed = createComputed(() => value() * 2)  // derived value
```

- `value` is an **Accessor** — a callable object. `value()` reads the current value.
- Pass the Accessor **object** to JSX props: `label={value.as(v => v.toString())}` or `visible={value}`
- **Never call it in JSX props**: `label={value()}` captures the value at construction time — not reactive.
- `.as(fn)` maps an Accessor to a new Accessor.

### Dynamic children — use `<With>`

If child widgets depend on reactive state, use `<With>`:

```tsx
<With value={someAccessor}>
    {(v) => <label label={v.toString()} />}
</With>
```

**Do not** pass an Accessor as a JSX child directly — it renders as `"Accessor { Object instance... }"`.

### GTK4 JSX intrinsics

| JSX tag | GTK4 widget |
|---------|-------------|
| `<box>` | `Gtk.Box` |
| `<button>` | `Gtk.Button` |
| `<label>` | `Gtk.Label` |
| `<entry>` | `Gtk.Entry` |
| `<revealer>` | `Gtk.Revealer` |
| `<scrolledwindow>` | `Gtk.ScrolledWindow` |
| `<levelbar>` | `Gtk.LevelBar` |
| `<image>` | `Gtk.Image` |
| `<window>` | `Astal.Window` (layer-shell) |

**Orientation**: always `orientation={Gtk.Orientation.VERTICAL}` — there is no `vertical` boolean prop.

**Alignment**: `halign={Gtk.Align.START}` / `Gtk.Align.END` / `Gtk.Align.CENTER` / `Gtk.Align.FILL`

### Widget files must use `.tsx` extension

The AGS bundler only processes JSX in `.tsx` files. Never create widget files with `.ts`.

---

## CSS — GTK4 subset

GTK4 CSS is not web CSS. These web properties are **invalid and will be silently ignored**:

- `box-sizing`, `overflow`, `max-width`, `max-height`, `margin: auto`, `display: flex`
- Pseudo-elements: `::before`, `::after`
- `position: absolute/relative/fixed`

### Palette variables (top of style.css)

```css
@define-color bg          #10140f;
@define-color surface     #1d211b;
@define-color surface_hi  #272b25;
@define-color surface_top #323630;
@define-color primary     #a2d399;
@define-color primary_dim #6da864;
@define-color on_surface  #e0e4db;
@define-color muted       #8c9388;
@define-color outline     #424940;
@define-color danger      #ffb4ab;
```

Always use these variables. Never hardcode hex colors in component rules.

### Animation timing conventions

Keep transitions fast to match Hyprland's snappy feel:

- Hover state changes: **60ms**
- Button/card background: **80ms**
- Small icon/color changes: **50ms**
- Revealer slide: **100ms**

---

## Adding a new widget

1. Create `widget/MyWidget.tsx` — export a default function returning JSX
2. Use `.card` as the outer class for a consistent surface + border:
   ```tsx
   export default function MyWidget() {
       return <box class="card my-section" orientation={Gtk.Orientation.VERTICAL}>
           ...
       </box>
   }
   ```
3. Import and add to `widget/Sidebar.tsx` inside the scrolled content `<box>`:
   ```tsx
   import MyWidget from "./MyWidget"
   // ...
   <MyWidget />
   ```
4. Add CSS for `.my-section` and any child classes in `style.css`. Follow the section comment pattern:
   ```css
   /* ── My Widget ─────────────────────────────────────────────────── */
   .my-section { ... }
   ```

---

## Removing a widget

Delete its import and JSX tag from `Sidebar.tsx`. Delete its `.tsx` file. Remove its CSS block from `style.css`. Do not leave dead imports or CSS rules.

---

## IPC / toggle mechanism

`app.ts` registers a `requestHandler` that responds to:

| Command | Effect |
|---------|--------|
| `toggle` | flip visibility |
| `open` | show |
| `close` | hide |

Send via: `ags -i sidebar request toggle`

`toggle.sh` tries IPC first; if the instance isn't running it starts a fresh one:

```bash
if ags -i sidebar request toggle 2>/dev/null; then exit 0; fi
ags run "$HOME/sidebar/app.ts" &
```

---

## Restarting after code changes

AGS does not hot-reload. After any code change:

```bash
pkill -f "ags run.*sidebar" && bash ~/sidebar/toggle.sh
```

---

## Hyprland integration

**Keybind** (`~/.config/hypr/conf/custom.conf`):
```ini
bind = $mainMod CTRL, S, exec, bash ~/sidebar/toggle.sh
```

**Blur layerrule** (same file):
```ini
layerrule = blur on, match:namespace sidebar
```

The `namespace="sidebar"` prop in `Sidebar.tsx` is what the layerrule targets. Do not change the namespace without updating the layerrule.

**Margins** in `Sidebar.tsx` (`marginTop/Right/Bottom = 20`) match `gaps_out = 20` in the Hyprland config. The `border-radius: 10px` in `.sidebar-container` matches `rounding = 10`. Keep these in sync if the Hyprland config changes.

---

## Keybinds parser

`KeybindsPanel.tsx` parses Hyprland `.conf` files at startup. Rules:

- Only `bind`, `binde`, `bindd`, `bindm` lines are parsed
- The line **must** end with a `# inline comment` — that becomes the description
- Lines without a trailing comment are skipped
- `$mainMod` is expanded to `SUPER`; other `$VAR` definitions in the file are also expanded
- Section headings come from `# Comment lines` that contain no `=` and are under 40 characters
- Mouse binds (`key` starts with `mouse`) are skipped

To add a keybind to the cheatsheet, add a trailing comment:
```ini
bind = $mainMod, T, exec, kitty  # Terminal
```

---

## TypeScript / build notes

- No build step — AGS bundles TypeScript at runtime via esbuild
- `tsconfig.json` maps `"ags/*"` to `/usr/share/ags/js/lib/*.ts` — do not change these paths
- `node_modules/` is excluded from git (`.gitignore`) — no `npm install` is needed; AGS ships its own deps at `/usr/share/ags/js/node_modules/`
- Type errors that don't block runtime are acceptable — AGS's own types are incomplete in places

---

## What not to do

- Do not use `Variable`, `bind()`, or any AGS v1/v2 API
- Do not import from `"astal"` or `"astal/gtk4"`
- Do not add web CSS properties (see list above)
- Do not pass Accessors as JSX children — use `<With>` or `.as()`
- Do not call `value()` inside JSX attribute positions expecting reactivity
- Do not amend published commits — always create new commits
- Do not push to the remote without user confirmation
