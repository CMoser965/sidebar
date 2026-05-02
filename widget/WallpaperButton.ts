import { Gtk } from "astal/gtk4"
import { execAsync } from "astal"

export default function WallpaperButton() {
    return <button
        class="action-button"
        tooltip_text="Open wallpaper picker"
        hexpand
        on_clicked={() => execAsync("waypaper").catch(console.error)}
    >
        <box vertical spacing={6} halign={Gtk.Align.CENTER}>
            <label class="action-icon" label="󰸉" />
            <label class="action-label" label="Wallpaper" />
        </box>
    </button>
}
