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
            {/* Header */}
            <box class="sidebar-header" spacing={8}>
                <label class="sidebar-title" label="Control Center" hexpand halign={Gtk.Align.START} />
                <button
                    class={pinned.as((p) => `header-btn${p ? " pinned" : ""}`)}
                    tooltipText={pinned.as((p) => (p ? "Unpin" : "Pin"))}
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
                    class="header-btn"
                    tooltipText="Close"
                    onClicked={() => App.get_window("sidebar")?.set_visible(false)}
                >
                    <label label="󰅙" />
                </button>
            </box>

            {/* Scrollable content */}
            <scrolledwindow
                vexpand
                hscrollbarPolicy={Gtk.PolicyType.NEVER}
                vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            >
                <box class="sidebar-content" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                    <MediaWidget />
                    <box class="actions-row" spacing={8}>
                        <WallpaperButton />
                        <ThemeButton />
                    </box>
                    <KeybindsPanel />
                </box>
            </scrolledwindow>
        </box>
    </window>
}
