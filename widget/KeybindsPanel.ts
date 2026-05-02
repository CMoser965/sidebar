import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
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

    // resolve common variables before parsing
    const vars: Record<string, string> = {
        "$mainMod": "SUPER",
        "$SCRIPTS": `${HOME}/.config/ml4w/scripts`,
        "$HYPRSCRIPTS": `${HOME}/.config/hypr/scripts`,
    }

    const sections: { section: string; binds: Keybind[] }[] = []
    let currentSection = "General"

    for (const raw of lines) {
        const line = raw.trim()

        // section comment: a standalone # line with no "=" sign
        if (line.startsWith("#") && !line.includes("=")) {
            const heading = line.replace(/^#+\s*/, "").trim()
            if (heading.length > 0 && heading.length < 40) {
                currentSection = heading
            }
            continue
        }

        // variable definition
        const varMatch = line.match(/^\$(\w+)\s*=\s*(.+)$/)
        if (varMatch) {
            vars[`$${varMatch[1]}`] = varMatch[2].trim()
            continue
        }

        // bind line with a description comment
        const bindMatch = line.match(/^bind[dem]?\s*=\s*([^,]*),\s*([^,]*),\s*[^#]*#\s*(.+)$/)
        if (!bindMatch) continue

        let mods = bindMatch[1].trim()
        const key = bindMatch[2].trim()
        const desc = bindMatch[3].trim()

        // resolve variables in modifiers
        for (const [k, v] of Object.entries(vars)) {
            mods = mods.replace(k, v)
        }

        // skip mouse binds — they're obvious
        if (key.startsWith("mouse")) continue

        // build human-readable modifier string
        const modParts = mods
            .split(/\s+/)
            .filter(Boolean)
            .map((m) => m === "SUPER" ? "⌘" : m === "SHIFT" ? "⇧" : m === "CTRL" ? "⌃" : m === "ALT" ? "⌥" : m)
            .join(" ")

        const combo = `${modParts} ${key}`.trim()

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
        const parsed = parseKeybinds(readFile(f))
        for (const { section, binds } of parsed) {
            const existing = sectionMap.get(section) ?? []
            sectionMap.set(section, [...existing, ...binds])
        }
    }

    return Array.from(sectionMap.entries()).map(([section, binds]) => ({ section, binds }))
}

function resolveKeyLabel(mod: string, key: string): string {
    const HOME = GLib.get_home_dir()
    const modParts = mod
        .split(/\s+/)
        .filter(Boolean)
        .map((m) => m === "SUPER" ? "⌘" : m === "SHIFT" ? "⇧" : m === "CTRL" ? "⌃" : m === "ALT" ? "⌥" : m)
        .join(" ")
    return `${modParts} ${key}`.trim()
}

export default function KeybindsPanel() {
    const sections = loadAllKeybinds()
    const search = Variable("")
    const expanded = Variable(false)

    return <box class="section keybinds-section" vertical spacing={0}>
        <button
            class="section-header"
            on_clicked={() => expanded.set(!expanded.get())}
        >
            <box spacing={8}>
                <label label="󰌌" class="section-icon" />
                <label label="Keybinds" class="section-title" hexpand halign={Gtk.Align.START} />
                <label label={expanded().as((e) => e ? "󰅃" : "󰅀")} class="chevron" />
            </box>
        </button>

        <revealer
            reveal_child={expanded()}
            transition_type={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transition_duration={200}
        >
            <box vertical spacing={8} class="keybinds-content">
                <entry
                    class="keybinds-search"
                    placeholder_text="Search keybinds…"
                    on_changed={(self) => search.set(self.text)}
                />
                <box vertical spacing={2}>
                    {sections.map(({ section, binds }) => (
                        <KeybindSection
                            section={section}
                            binds={binds}
                            search={search}
                        />
                    ))}
                </box>
            </box>
        </revealer>
    </box>
}

function KeybindSection({
    section,
    binds,
    search,
}: {
    section: string
    binds: Keybind[]
    search: Variable<string>
}) {
    return <box vertical spacing={0}>
        <label
            class="keybind-section-label"
            label={section}
            halign={Gtk.Align.START}
            visible={search().as((q) => {
                if (!q) return true
                return binds.some((b) => b.description.toLowerCase().includes(q.toLowerCase()) || b.key.toLowerCase().includes(q.toLowerCase()))
            })}
        />
        {binds.map((bind) => (
            <KeybindRow bind={bind} search={search} />
        ))}
    </box>
}

function KeybindRow({ bind, search }: { bind: Keybind; search: Variable<string> }) {
    const combo = resolveKeyLabel(bind.modifiers, bind.key)

    return <box
        class="keybind-row"
        spacing={8}
        visible={search().as((q) => {
            if (!q) return true
            const lower = q.toLowerCase()
            return bind.description.toLowerCase().includes(lower) || bind.key.toLowerCase().includes(lower)
        })}
    >
        <label class="keybind-combo" label={combo} halign={Gtk.Align.START} />
        <label class="keybind-desc" label={bind.description} hexpand halign={Gtk.Align.END} ellipsize={3} />
    </box>
}
