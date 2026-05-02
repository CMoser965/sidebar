import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

const SCRIPT = `${GLib.get_home_dir()}/.local/bin/boot-windows.sh`

export default function WindowsButton() {
    return <button
        class="action-btn"
        tooltipText="Reboot into Windows"
        hexpand
        onClicked={() => execAsync(["bash", SCRIPT]).catch(console.error)}
    >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <label class="action-icon" label={""} />
            <label class="action-label" label="Windows" />
        </box>
    </button>
}
