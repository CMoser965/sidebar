import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"

export default function WallpaperButton() {
    return <button
        class="action-button"
        tooltipText="Open wallpaper picker"
        hexpand
        onClicked={() => execAsync("waypaper").catch(console.error)}
    >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <label class="action-icon" label="󰸉" />
            <label class="action-label" label="Wallpaper" />
        </box>
    </button>
}
