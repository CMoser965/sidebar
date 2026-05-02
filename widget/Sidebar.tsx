import App from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import { createState } from "ags"
import WallpaperButton from "./WallpaperButton"
import ThemeButton from "./ThemeButton"
import KeybindsPanel from "./KeybindsPanel"
import MediaWidget from "./MediaWidget"

export default function Sidebar() {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor
    const [pinned, setPinned] = createState(false)

    return <window
        name="sidebar"
        class="sidebar"
        application={App}
        anchor={TOP | RIGHT | BOTTOM}
        layer={Astal.Layer.TOP}
        exclusivity={Astal.Exclusivity.NORMAL}
        keymode={Astal.Keymode.ON_DEMAND}
        visible={false}
    >
        <box class="sidebar-container" orientation={Gtk.Orientation.VERTICAL}>
            <box class="sidebar-header" spacing={8}>
                <label
                    class="sidebar-title"
                    label="Control Center"
                    hexpand
                    halign={Gtk.Align.START}
                />
                <button
                    class={pinned.as((p) => `pin-button${p ? " pinned" : ""}`)}
                    tooltipText={pinned.as((p) => (p ? "Unpin sidebar" : "Pin sidebar"))}
                    onClicked={() => {
                        const next = !pinned()
                        setPinned(next)
                        const win = App.get_window("sidebar") as Astal.Window | undefined
                        if (win) {
                            win.exclusivity = next
                                ? Astal.Exclusivity.EXCLUSIVE
                                : Astal.Exclusivity.NORMAL
                        }
                    }}
                >
                    <label label={pinned.as((p) => (p ? "󰐃" : "󰐄"))} />
                </button>
                <button
                    class="close-button"
                    tooltipText="Close"
                    onClicked={() => App.get_window("sidebar")?.set_visible(false)}
                >
                    <label label="󰅙" />
                </button>
            </box>
            <scrolledwindow
                vexpand
                hscrollbarPolicy={Gtk.PolicyType.NEVER}
                vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            >
                <box class="sidebar-content" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                    <MediaWidget />
                    <box class="section-actions" spacing={8}>
                        <WallpaperButton />
                        <ThemeButton />
                    </box>
                    <KeybindsPanel />
                </box>
            </scrolledwindow>
        </box>
    </window>
}
