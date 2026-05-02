import { Gtk } from "ags/gtk4"
import { createState } from "ags"
import GLib from "gi://GLib"

interface Keybind {
    section: string
    modifiers: string
    key: string
    description: string
}

function readFile(path: string): string {
    try {
        const [ok, bytes] = GLib.file_get_contents(path)
        if (!ok || !bytes) return ""
        return new TextDecoder().decode(bytes)
    } catch {
        return ""
    }
}

function parseKeybinds(content: string): { section: string; binds: Keybind[] }[] {
    const HOME = GLib.get_home_dir()
    const lines = content.split("\n")
    const vars: Record<string, string> = {
        "$mainMod": "SUPER",
        "$SCRIPTS": `${HOME}/.config/ml4w/scripts`,
        "$HYPRSCRIPTS": `${HOME}/.config/hypr/scripts`,
    }
    const sections: { section: string; binds: Keybind[] }[] = []
    let currentSection = "General"

    for (const raw of lines) {
        const line = raw.trim()

        if (line.startsWith("#") && !line.includes("=")) {
            const heading = line.replace(/^#+\s*/, "").trim()
            if (heading.length > 0 && heading.length < 40) currentSection = heading
            continue
        }

        const varMatch = line.match(/^\$(\w+)\s*=\s*(.+)$/)
        if (varMatch) {
            vars[`$${varMatch[1]}`] = varMatch[2].trim()
            continue
        }

        const bindMatch = line.match(/^bind[dem]?\s*=\s*([^,]*),\s*([^,]*),\s*[^#]*#\s*(.+)$/)
        if (!bindMatch) continue

        let mods = bindMatch[1].trim()
        const key = bindMatch[2].trim()
        const desc = bindMatch[3].trim()

        for (const [k, v] of Object.entries(vars)) mods = mods.replace(k, v)

        if (key.startsWith("mouse")) continue

        let section = sections.find((s) => s.section === currentSection)
        if (!section) {
            section = { section: currentSection, binds: [] }
            sections.push(section)
        }
        section.binds.push({ section: currentSection, modifiers: mods, key, description: desc })
    }

    return sections
}

function loadAllKeybinds(): { section: string; binds: Keybind[] }[] {
    const HOME = GLib.get_home_dir()
    const files = [
        `${HOME}/.config/hypr/conf/keybindings/default.conf`,
        `${HOME}/.config/hypr/conf/custom.conf`,
    ]
    const sectionMap = new Map<string, Keybind[]>()
    for (const f of files) {
        for (const { section, binds } of parseKeybinds(readFile(f))) {
            sectionMap.set(section, [...(sectionMap.get(section) ?? []), ...binds])
        }
    }
    return Array.from(sectionMap.entries()).map(([section, binds]) => ({ section, binds }))
}

function comboLabel(mod: string, key: string): string {
    const parts = mod
        .split(/\s+/)
        .filter(Boolean)
        .map((m) =>
            m === "SUPER" ? "⌘" : m === "SHIFT" ? "⇧" : m === "CTRL" ? "⌃" : m === "ALT" ? "⌥" : m,
        )
        .join(" ")
    return `${parts} ${key}`.trim()
}

export default function KeybindsPanel() {
    const sections = loadAllKeybinds()
    const [query, setQuery] = createState("")
    const [open, setOpen] = createState(false)

    return <box class="card keybinds-section" orientation={Gtk.Orientation.VERTICAL}>
        <button
            class="section-toggle"
            onClicked={() => setOpen(!open())}
        >
            <box spacing={10}>
                <label label="󰌌" class="section-icon" />
                <label label="Keybinds" class="section-title" hexpand halign={Gtk.Align.START} />
                <label label={open.as((o) => (o ? "󰅃" : "󰅀"))} class="chevron" />
            </box>
        </button>

        <revealer
            revealChild={open}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={100}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={0} class="keybinds-body">
                <entry
                    class="keybinds-search"
                    placeholderText="Search keybinds…"
                    onChanged={(self: Gtk.Entry) => setQuery(self.text)}
                />
                <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    {sections.map(({ section, binds }) => (
                        <KeybindSection section={section} binds={binds} query={query} />
                    ))}
                </box>
            </box>
        </revealer>
    </box>
}

function KeybindSection({
    section,
    binds,
    query,
}: {
    section: string
    binds: Keybind[]
    query: ReturnType<typeof createState<string>>[0]
}) {
    const visible = query.as((q) => {
        if (!q) return true
        const lower = q.toLowerCase()
        return binds.some(
            (b) =>
                b.description.toLowerCase().includes(lower) ||
                b.key.toLowerCase().includes(lower),
        )
    })

    return <box orientation={Gtk.Orientation.VERTICAL} spacing={0} visible={visible}>
        <label class="keybind-group-label" label={section} halign={Gtk.Align.START} />
        {binds.map((bind) => (
            <KeybindRow bind={bind} query={query} />
        ))}
    </box>
}

function KeybindRow({
    bind,
    query,
}: {
    bind: Keybind
    query: ReturnType<typeof createState<string>>[0]
}) {
    const combo = comboLabel(bind.modifiers, bind.key)
    const visible = query.as((q) => {
        if (!q) return true
        const lower = q.toLowerCase()
        return (
            bind.description.toLowerCase().includes(lower) ||
            bind.key.toLowerCase().includes(lower)
        )
    })

    return <box class="keybind-row" spacing={8} visible={visible}>
        <label class="keybind-combo" label={combo} halign={Gtk.Align.START} />
        <label
            class="keybind-desc"
            label={bind.description}
            hexpand
            halign={Gtk.Align.END}
            ellipsize={3}
        />
    </box>
}
