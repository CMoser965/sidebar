import { Gtk } from "ags/gtk4"
import { createBinding, createComputed, With } from "ags"
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

    return <box class="media-player" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <box spacing={12}>
            <With value={hasCover}>
                {(has) =>
                    has
                        ? <image class="media-art" file={coverArt} pixelSize={80} />
                        : <box class="media-art-fallback" valign={Gtk.Align.CENTER}>
                              <label class="media-art-icon" label="󰎈" />
                          </box>
                }
            </With>
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand valign={Gtk.Align.CENTER}>
                <label class="media-title" label={title} ellipsize={3} halign={Gtk.Align.START} maxWidthChars={24} />
                <label class="media-artist" label={artist} ellipsize={3} halign={Gtk.Align.START} maxWidthChars={24} />
                <box class="media-time-row" spacing={6}>
                    <label class="media-time" label={position.as(formatTime)} />
                    <label class="media-time-sep" label="·" />
                    <label class="media-time" label={length.as(formatTime)} />
                </box>
            </box>
        </box>

        <levelbar class="media-progress" value={fraction} minValue={0} maxValue={1} />

        <box class="media-controls" spacing={0} halign={Gtk.Align.CENTER}>
            <button class="media-btn" tooltipText="Previous" onClicked={() => player.previous()} sensitive={createBinding(player, "canGoPrevious")}>
                <label label="󰒮" />
            </button>
            <button class="media-btn media-btn-play" tooltipText={isPlaying.as((p) => (p ? "Pause" : "Play"))} onClicked={() => player.playPause()} sensitive={createBinding(player, "canPlay")}>
                <label label={isPlaying.as((p) => (p ? "󰏤" : "󰐊"))} />
            </button>
            <button class="media-btn" tooltipText="Next" onClicked={() => player.next()} sensitive={createBinding(player, "canGoNext")}>
                <label label="󰒭" />
            </button>
        </box>
    </box>
}

export default function MediaWidget() {
    const mpris = Mpris.get_default()
    const players = createBinding(mpris, "players")

    return <box class="card media-section" orientation={Gtk.Orientation.VERTICAL}>
        <With value={players}>
            {(ps: Mpris.Player[]) => {
                const player = ps.find((p) => p.busName?.includes("spotify")) ?? ps[0]
                return player
                    ? <PlayerWidget player={player} />
                    : <box class="media-empty" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} spacing={8}>
                          <label class="media-empty-icon" label="󰝚" />
                          <label class="media-empty-label" label="Nothing playing" />
                      </box>
            }}
        </With>
    </box>
}
