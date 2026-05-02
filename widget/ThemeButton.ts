import { Gtk } from "astal/gtk4"
import { execAsync } from "astal"
import GLib from "gi://GLib"

const THEME_SWITCHER = `${GLib.get_home_dir()}/.config/ml4w/themes/themes.sh`

export default function ThemeButton() {
    return <button
        class="action-button"
        tooltip_text="Open theme switcher"
        hexpand
        on_clicked={() => execAsync(THEME_SWITCHER).catch(console.error)}
    >
        <box vertical spacing={6} halign={Gtk.Align.CENTER}>
            <label class="action-icon" label="󰔎" />
            <label class="action-label" label="Theme" />
        </box>
    </button>
}
