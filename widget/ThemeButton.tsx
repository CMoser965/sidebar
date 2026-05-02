import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

const THEME_SWITCHER = `${GLib.get_home_dir()}/.config/ml4w/themes/themes.sh`

export default function ThemeButton() {
    return <button
        class="action-btn"
        tooltipText="Open theme switcher"
        hexpand
        onClicked={() => execAsync(THEME_SWITCHER).catch(console.error)}
    >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <label class="action-icon" label="󰔎" />
            <label class="action-label" label="Theme" />
        </box>
    </button>
}
