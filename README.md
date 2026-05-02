# sidebar

A custom control-center sidebar for Hyprland built with [AGS v3](https://github.com/Aylur/ags) (Astal + GTK4 + TypeScript). Replaces the ML4W QuickShell sidebar with a fully modular, reactive panel that floats with proper gaps and rounded corners matching your Hyprland config.

![sidebar screenshot placeholder]

## Features

- **Media controls** — MPRIS album art, title, artist, progress bar, play/pause/skip (prefers Spotify)
- **Wallpaper & Theme** — one-tap launcher for `waypaper` and the ML4W theme switcher
- **Keybinds cheatsheet** — parses your Hyprland `.conf` files live; collapsible with live search
- **Pin toggle** — keeps the sidebar open and reserves screen space (exclusive zone)
- **Hyprland-native look** — floats with `gaps_out` margins, `rounding` border-radius, and blur via layerrule
- **Material You dark green** palette (Matugen-generated)

## Requirements

| Package | Source |
|---------|--------|
| `aylurs-gtk-shell` | AUR (`libastal-git`, `libastal-4-git` first) |
| `astal-mpris` | AUR |
| `waypaper` | AUR (for wallpaper button) |
| `hyprshot` | AUR (optional, for screenshot keybinds) |

## Installation

```bash
# 1. Clone
git clone https://github.com/CMoser965/sidebar.git ~/sidebar

# 2. Install AUR deps (order matters)
aura -A libastal-git libastal-4-git
aura -A aylurs-gtk-shell astal-mpris-git

# 3. No npm install needed — AGS ships its own TypeScript at /usr/share/ags/js/
```

## Usage

**Toggle from keybind** — add to `~/.config/hypr/conf/custom.conf`:
```ini
bind = $mainMod CTRL, S, exec, bash ~/sidebar/toggle.sh
layerrule = blur on, match:namespace sidebar
```

**Toggle from Waybar** — set your module's `on-click`:
```json
"on-click": "bash ~/sidebar/toggle.sh"
```

`toggle.sh` starts the AGS instance if it isn't running, or toggles visibility if it is:
```bash
#!/usr/bin/env bash
if ags -i sidebar request toggle 2>/dev/null; then exit 0; fi
ags run "$HOME/sidebar/app.ts" &
```

## Project Structure

```
sidebar/
├── app.ts                  # Entry point: IPC server, CSS loading, window init
├── style.css               # All GTK4 CSS — palette variables + component styles
├── toggle.sh               # Start-or-toggle helper called by Waybar / keybind
├── tsconfig.json           # Paths to system AGS TypeScript at /usr/share/ags/js/
└── widget/
    ├── Sidebar.tsx         # Layer-shell window, layout skeleton, pin logic
    ├── MediaWidget.tsx     # MPRIS player with art, progress, and controls
    ├── KeybindsPanel.tsx   # Collapsible keybinds cheatsheet with live search
    ├── WallpaperButton.tsx # Launches waypaper
    └── ThemeButton.tsx     # Launches ML4W theme switcher
```

## Customization

### Colors

All colors are CSS variables at the top of `style.css`. Swap them to match your Matugen output or any palette:

```css
@define-color bg          #10140f;
@define-color surface     #1d211b;
@define-color primary     #a2d399;   /* accent — buttons, icons, keybind chips */
@define-color on_surface  #e0e4db;   /* primary text */
@define-color muted       #8c9388;   /* secondary text */
@define-color outline     #424940;   /* borders */
```

### Margins / rounding

`widget/Sidebar.tsx` sets margins to match Hyprland's `gaps_out`. Change them to match your config:

```tsx
marginTop={20}
marginRight={20}
marginBottom={20}
```

The `border-radius: 10px` in `style.css` (`.sidebar-container`) should match your `rounding` value.

### Adding a new widget

1. Create `widget/MyWidget.tsx` — export a default function returning JSX
2. Import and drop it into the `<box>` inside `widget/Sidebar.tsx`:
   ```tsx
   import MyWidget from "./MyWidget"
   // ...
   <MyWidget />
   ```
3. Style it in `style.css` — use `.card` as a base class for consistent surface+border

### Removing a widget

Delete its import and JSX tag from `Sidebar.tsx`. The panel reflows automatically.

### Changing the keybind files parsed

`KeybindsPanel.tsx` reads a hardcoded list of files. Edit the `files` array in `loadAllKeybinds()`:

```ts
const files = [
    `${HOME}/.config/hypr/conf/keybindings/default.conf`,
    `${HOME}/.config/hypr/conf/custom.conf`,
]
```

Any `bind` / `binde` / `bindd` / `bindm` line that ends with a `# comment` becomes a keybind entry. Lines without a trailing comment are skipped.

### Swapping the media player preference

`MediaWidget.tsx` prefers Spotify. Change the selector in the `<With>` block:

```ts
const player = ps.find(p => p.busName?.includes("spotify")) ?? ps[0]
```

Replace `"spotify"` with any MPRIS bus name fragment (e.g. `"firefox"`, `"vlc"`).

## AGS v3 Notes

This project targets **AGS 3.1.2** (the Astal rewrite). Key API differences from AGS v1/v2:

- Import paths: `"ags/gtk4"`, `"ags/gtk4/app"`, `"ags"`, `"ags/process"` — **not** `"astal/*"`
- Reactivity: `createState`, `createBinding`, `createComputed` from `"ags"` (gnim) — **not** `Variable`/`bind`
- Dynamic children: use `<With value={accessor}>` — passing an Accessor as a JSX child renders its `.toString()`
- GTK4 Box orientation: `orientation={Gtk.Orientation.VERTICAL}` — **not** `vertical={true}`
- Widget files must use `.tsx` extension for JSX

## License

MIT
