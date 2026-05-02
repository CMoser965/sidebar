import { Gtk } from "ags/gtk4"
import { createBinding, createComputed } from "ags"
import Mpris from "gi://AstalMpris"

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
}

function PlayerWidget({ player }: { player: Mpris.Player }) {
    const isPlaying = createBinding(player, "playbackStatus").as(
        (s) => s === Mpris.PlaybackStatus.PLAYING,
    )
    const title = createBinding(player, "title").as((t) => t || "Unknown Track")
    const artist = createBinding(player, "artist").as((a) => a || "Unknown Artist")
    const coverArt = createBinding(player, "coverArt")
    const hasCover = coverArt.as((c) => !!c)
    const position = createBinding(player, "position")
    const length = createBinding(player, "length")
    const fraction = createComputed(() => {
        const len = length()
        return len > 0 ? Math.min(position() / len, 1) : 0
    })

    return <box class="media-player" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <box spacing={12}>
            <box class="media-art-box" visible={hasCover}>
                <image class="media-art" file={coverArt} pixelSize={64} />
            </box>
            <box class="media-art-box media-art-fallback" visible={hasCover.as((h) => !h)}>
                <label class="media-art-icon" label="󰎈" />
            </box>
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand valign={Gtk.Align.CENTER}>
                <label
                    class="media-title"
                    label={title}
                    ellipsize={3}
                    halign={Gtk.Align.START}
                    maxWidthChars={22}
                />
                <label
                    class="media-artist"
                    label={artist}
                    ellipsize={3}
                    halign={Gtk.Align.START}
                    maxWidthChars={22}
                />
            </box>
        </box>

        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <levelbar class="media-progress" value={fraction} minValue={0} maxValue={1} />
            <box>
                <label class="media-time" label={position.as(formatTime)} />
                <label class="media-time" label=" / " />
                <label class="media-time" label={length.as(formatTime)} />
            </box>
        </box>

        <box class="media-controls" spacing={8} halign={Gtk.Align.CENTER}>
            <button
                class="media-btn"
                tooltipText="Previous"
                onClicked={() => player.previous()}
                sensitive={createBinding(player, "canGoPrevious")}
            >
                <label label="󰒮" />
            </button>
            <button
                class="media-btn media-btn-play"
                tooltipText={isPlaying.as((p) => (p ? "Pause" : "Play"))}
                onClicked={() => player.playPause()}
                sensitive={createBinding(player, "canPlay")}
            >
                <label label={isPlaying.as((p) => (p ? "󰏤" : "󰐊"))} />
            </button>
            <button
                class="media-btn"
                tooltipText="Next"
                onClicked={() => player.next()}
                sensitive={createBinding(player, "canGoNext")}
            >
                <label label="󰒭" />
            </button>
        </box>
    </box>
}

export default function MediaWidget() {
    const mpris = Mpris.get_default()
    const players = createBinding(mpris, "players")

    const content = players.as((ps) => {
        const player =
            ps.find((p: Mpris.Player) => p.busName?.includes("spotify")) ?? ps[0]

        return player
            ? <PlayerWidget player={player} />
            : <box class="media-empty" halign={Gtk.Align.CENTER}>
                  <label class="media-empty-label" label="Nothing playing" />
              </box>
    })

    return <box class="section media-section" orientation={Gtk.Orientation.VERTICAL}>
        <box class="section-header-static">
            <label label="󰝚" class="section-icon" />
            <label label="Media" class="section-title" hexpand halign={Gtk.Align.START} />
        </box>
        {content}
    </box>
}
