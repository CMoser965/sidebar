import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable } from "astal"
import WallpaperButton from "./WallpaperButton"
import ThemeButton from "./ThemeButton"
import KeybindsPanel from "./KeybindsPanel"
import MediaWidget from "./MediaWidget"

const pinned = Variable(false)

export default function Sidebar() {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor

    return <window
        name="sidebar"
        class="sidebar"
        application={App}
        anchor={TOP | RIGHT | BOTTOM}
        layer={Astal.Layer.TOP}
        exclusivity={pinned().as((p) => p ? Astal.Exclusivity.EXCLUSIVE : Astal.Exclusivity.NORMAL)}
        keymode={Astal.Keymode.ON_DEMAND}
        visible={false}
    >
        <box class="sidebar-container" vertical>
            <Header pinned={pinned} />
            <scrolled
                vexpand
                hscrollbar_policy={Gtk.PolicyType.NEVER}
                vscrollbar_policy={Gtk.PolicyType.AUTOMATIC}
            >
                <box class="sidebar-content" vertical spacing={12}>
                    <MediaWidget />
                    <box class="section-actions" spacing={8}>
                        <WallpaperButton />
                        <ThemeButton />
                    </box>
                    <KeybindsPanel />
                </box>
            </scrolled>
        </box>
    </window>
}

function Header({ pinned }: { pinned: Variable<boolean> }) {
    return <box class="sidebar-header" spacing={8}>
        <label class="sidebar-title" label="Control Center" hexpand halign={Gtk.Align.START} />
        <button
            class={pinned().as((p) => `pin-button ${p ? "pinned" : ""}`)}
            tooltip_text={pinned().as((p) => p ? "Unpin sidebar" : "Pin sidebar")}
            on_clicked={() => pinned.set(!pinned.get())}
        >
            <label label={pinned().as((p) => p ? "󰐃" : "󰐄")} />
        </button>
        <button
            class="close-button"
            tooltip_text="Close"
            on_clicked={() => App.get_window("sidebar")?.set_visible(false)}
        >
            <label label="󰅙" />
        </button>
    </box>
}
