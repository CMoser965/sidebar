import App from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import WallpaperButton from "./WallpaperButton"
import ThemeButton from "./ThemeButton"
import WindowsButton from "./WindowsButton"
import KeybindsPanel from "./KeybindsPanel"
import MediaWidget from "./MediaWidget"
import SDGImageWidget from "./SDGImageWidget"

export default function Sidebar() {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor

    return <window
        name="sidebar"
        namespace="sidebar"
        class="sidebar"
        application={App}
        anchor={TOP | RIGHT | BOTTOM}
        layer={Astal.Layer.TOP}
        exclusivity={Astal.Exclusivity.NORMAL}
        keymode={Astal.Keymode.ON_DEMAND}
        marginTop={20}
        marginRight={20}
        marginBottom={20}
        visible={false}
    >
        <box class="sidebar-container" orientation={Gtk.Orientation.VERTICAL}>
            {/* Header */}
            <box class="sidebar-header" spacing={8}>
                <label class="sidebar-title" label="Control Center" hexpand halign={Gtk.Align.START} />
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
                        <WindowsButton />
                    </box>
                    <KeybindsPanel />
                    <SDGImageWidget />
                </box>
            </scrolledwindow>
        </box>
    </window>
}
