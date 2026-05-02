import { Gtk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Mpris from "gi://AstalMpris"

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
}

function PlayerWidget({ player }: { player: Mpris.Player }) {
    const isPlaying = bind(player, "playback_status").as(
        (s) => s === Mpris.PlaybackStatus.PLAYING
    )

    const hasCover = bind(player, "cover_art").as((c) => !!c)
    const coverArt = bind(player, "cover_art")
    const title = bind(player, "title").as((t) => t || "Unknown Track")
    const artist = bind(player, "artist").as((a) => a || "Unknown Artist")
    const position = bind(player, "position")
    const length = bind(player, "length")

    const fraction = Variable.derive([position, length], (pos, len) =>
        len > 0 ? Math.min(pos / len, 1) : 0
    )

    return <box class="media-player" vertical spacing={8}>
        <box spacing={12}>
            {/* Album art */}
            <box class="media-art-box" visible={hasCover}>
                <image
                    class="media-art"
                    file={coverArt}
                    pixel_size={64}
                />
            </box>
            <box class="media-art-box media-art-fallback" visible={hasCover.as((h) => !h)}>
                <label class="media-art-icon" label="󰎈" />
            </box>

            {/* Track info */}
            <box vertical spacing={2} hexpand valign={Gtk.Align.CENTER}>
                <label
                    class="media-title"
                    label={title}
                    ellipsize={3}
                    halign={Gtk.Align.START}
                    max_width_chars={22}
                />
                <label
                    class="media-artist"
                    label={artist}
                    ellipsize={3}
                    halign={Gtk.Align.START}
                    max_width_chars={22}
                />
            </box>
        </box>

        {/* Progress bar */}
        <box vertical spacing={4}>
            <levelbar
                class="media-progress"
                value={fraction()}
                min_value={0}
                max_value={1}
            />
            <box>
                <label class="media-time" label={position.as(formatTime)} />
                <label class="media-time" label=" / " />
                <label class="media-time" label={length.as(formatTime)} />
            </box>
        </box>

        {/* Controls */}
        <box class="media-controls" spacing={8} halign={Gtk.Align.CENTER}>
            <button
                class="media-btn"
                tooltip_text="Previous"
                on_clicked={() => player.previous()}
                sensitive={bind(player, "can_go_previous")}
            >
                <label label="󰒮" />
            </button>
            <button
                class="media-btn media-btn-play"
                tooltip_text={isPlaying.as((p) => p ? "Pause" : "Play")}
                on_clicked={() => player.play_pause()}
                sensitive={bind(player, "can_play")}
            >
                <label label={isPlaying.as((p) => p ? "󰏤" : "󰐊")} />
            </button>
            <button
                class="media-btn"
                tooltip_text="Next"
                on_clicked={() => player.next()}
                sensitive={bind(player, "can_go_next")}
            >
                <label label="󰒭" />
            </button>
        </box>
    </box>
}

export default function MediaWidget() {
    const mpris = Mpris.get_default()
    const players = bind(mpris, "players")

    return <box class="section media-section" vertical spacing={0}>
        <box class="section-header-static">
            <label label="󰝚" class="section-icon" />
            <label label="Media" class="section-title" hexpand halign={Gtk.Align.START} />
        </box>

        {players.as((ps) => {
            // prefer spotify, then fall back to first player
            const player =
                ps.find((p) => p.bus_name?.includes("spotify")) ?? ps[0]

            if (!player) {
                return (
                    <box class="media-empty" halign={Gtk.Align.CENTER}>
                        <label class="media-empty-label" label="Nothing playing" />
                    </box>
                )
            }

            return <PlayerWidget player={player} />
        })}
    </box>
}
