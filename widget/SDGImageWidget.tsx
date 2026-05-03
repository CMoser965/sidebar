import { Gtk } from "ags/gtk4"
import { createState, createBinding, createComputed, With } from "ags"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

import { checkSetup } from "../lib/sdsetup"
import { generateImage, fetchModels, fetchEmbeddings, SdModel, SdEmbedding } from "../lib/sdapi"

const MAX_PREVIEW_WIDTH = 280

function buildEmbeddingText(embeddings: string[]): string {
    return embeddings
        .map((e) => `(embedding:${e}:1.0)`)
        .join(", ")
}

export default function SDGImageWidget() {
    const [open, setOpen] = createState(false)
    const [prompt, setPrompt] = createState("")
    const [negativePrompt, setNegativePrompt] = createState("")
    const [loading, setLoading] = createState(false)
    const [imageUrl, setImageUrl] = createState("")
    const [galleryPath, setGalleryPath] = createState("")
    const [error, setError] = createState("")
    const [models, setModels] = createState<SdModel[]>([])
    const [selectedModel, setSelectedModel] = createState("")
    const [embeddings, setEmbeddings] = createState<SdEmbedding[]>([])
    const [selectedEmbeddings, setSelectedEmbeddings] = createState<string[]>([])
    const [setupStatus, setSetupStatus] = createState<{ status: string; path: string | null } | null>(null)
    const [showSetup, setShowSetup] = createState(false)

    const ready = createComputed(() => setupStatus()?.status === "connected")

    return <box class="card sdg-section" orientation={Gtk.Orientation.VERTICAL}>
        <box class="sdg-header" spacing={8}>
            <button
                class="section-toggle"
                onClicked={() => setOpen(!open())}
            >
                <box spacing={10}>
                    <label class="sdg-icon" label="󰏫" />
                    <label label="Image Gen" hexpand halign={Gtk.Align.START} />
                    <label label={open.as((o) => (o ? "󰅃" : "󰅀"))} class="chevron" />
                </box>
            </button>
        </box>

        <revealer
            revealChild={open}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={100}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={0} class="sdg-body">
                <With value={setupStatus}>
                    {(status) => status === null ? <SetupLoader /> : null}
                </With>
                <With value={setupStatus}>
                    {(status) => status?.status === "connected" ? (
                        <GenerationUI
                            prompt={prompt}
                            setPrompt={setPrompt}
                            negativePrompt={negativePrompt}
                            setNegativePrompt={setNegativePrompt}
                            loading={loading}
                            setLoading={setLoading}
                            imageUrl={imageUrl}
                            setImageUrl={setImageUrl}
                            galleryPath={galleryPath}
                            setGalleryPath={setGalleryPath}
                            error={error}
                            setError={setError}
                            models={models}
                            setModels={setModels}
                            selectedModel={selectedModel}
                            setSelectedModel={setSelectedModel}
                            embeddings={embeddings}
                            setEmbeddings={setEmbeddings}
                            selectedEmbeddings={selectedEmbeddings}
                            setSelectedEmbeddings={setSelectedEmbeddings}
                        />
                    ) : status?.status === "installed-but-stopped" ? (
                        <SetupUI status={status} />
                    ) : (
                        <NoSetupUI />
                    )}
                </With>
            </box>
        </revealer>
    </box>
}

function SetupLoader() {
    const { status } = checkSetup()
    return null
}

function GenerationUI({
    prompt, setPrompt,
    negativePrompt, setNegativePrompt,
    loading, setLoading,
    imageUrl, setImageUrl,
    galleryPath, setGalleryPath,
    error, setError,
    models, setModels,
    selectedModel, setSelectedModel,
    embeddings, setEmbeddings,
    selectedEmbeddings, setSelectedEmbeddings,
}: {
    prompt: ReturnType<typeof createState<string>>[0]
    setPrompt: ReturnType<typeof createState<string>>[1]
    negativePrompt: ReturnType<typeof createState<string>>[1]
    setNegativePrompt: ReturnType<typeof createState<string>>[1]
    loading: ReturnType<typeof createState<boolean>>[0]
    setLoading: ReturnType<typeof createState<boolean>>[1]
    imageUrl: ReturnType<typeof createState<string>>[0]
    setImageUrl: ReturnType<typeof createState<string>>[1]
    galleryPath: ReturnType<typeof createState<string>>[0]
    setGalleryPath: ReturnType<typeof createState<string>>[1]
    error: ReturnType<typeof createState<string>>[0]
    setError: ReturnType<typeof createState<string>>[1]
    models: ReturnType<typeof createState<SdModel[]>[0]
    setModels: ReturnType<typeof createState<SdModel[]>[1]
    selectedModel: ReturnType<typeof createState<string>>[0]
    setSelectedModel: ReturnType<typeof createState<string>>[1]
    embeddings: ReturnType<typeof createState<SdEmbedding[]>[0]
    setEmbeddings: ReturnType<typeof createState<SdEmbedding[]>[1]
    selectedEmbeddings: ReturnType<typeof createState<string[]>[0]
    setSelectedEmbeddings: ReturnType<typeof createState<string[]>[1]
}) {
    return <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="sdg-gen-ui">
        <entry
            class="sdg-input sdg-prompt"
            placeholderText="Describe your image..."
            text={prompt.as((v) => v)}
            onChanged={(self: Gtk.Entry) => setPrompt(self.text)}
        />

        <entry
            class="sdg-input sdg-negative"
            placeholderText="Negative prompt (optional)…"
            text={negativePrompt.as((v) => v)}
            onChanged={(self: Gtk.Entry) => setNegativePrompt(self.text)}
        />

        <box class="sdg-selectors" spacing={8}>
            <ModelSelector
                models={models}
                setModels={setModels}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
            />
            <EmbeddingSelector
                embeddings={embeddings}
                setEmbeddings={setEmbeddings}
                selectedEmbeddings={selectedEmbeddings}
                setSelectedEmbeddings={setSelectedEmbeddings}
            />
        </box>

        <button
            class="sdg-generate-btn"
            onClicked={async () => {
                if (!prompt() || loading()) return
                setError("")
                setImageUrl("")
                setGalleryPath("")
                setLoading(true)
                try {
                    const result = await generateImage({
                        prompt: prompt(),
                        negative_prompt: negativePrompt(),
                        model: selectedModel() || undefined,
                        embeddings: selectedEmbeddings(),
                    })
                    setImageUrl(result.previewPath)
                    setGalleryPath(result.galleryPath)
                } catch (e) {
                    setError(e instanceof Error ? e.message : String(e))
                } finally {
                    setLoading(false)
                }
            }}
            sensitive={!loading() && !!prompt()}
        >
            <box spacing={6}>
                <label label={loading.as((l) => (l ? "󰑐 Generating…" : "Generate"))} />
            </box>
        </button>

        <With value={error}>
            {(err) => err ? (
                <label class="sdg-error" label={err} halign={Gtk.Align.CENTER} />
            ) : null}
        </With>

        <revealer
            revealChild={imageUrl.as((u) => !!u)}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={100}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER}>
                <With value={imageUrl}>
                    {(url) => <image class="sdg-preview-img" file={url} />}
                </With>
                <With value={galleryPath}>
                    {(path) => <button
                        class="sdg-save-btn"
                        tooltipText={`Saved to ${path}`}
                        visible={path.as((p) => !!p)}
                    >
                        <label label="󰏕 Saved to gallery" />
                    </button>}
                </With>
            </box>
        </revealer>
    </box>
}

function ModelSelector({
    models, setModels,
    selectedModel, setSelectedModel,
}: {
    models: SdModel[]
    setModels: (m: SdModel[]) => void
    selectedModel: string
    setSelectedModel: (m: string) => void
}) {
    const [ready, setReady] = createState(false)

    return <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
        <label class="sdg-label-sm" label="Model" halign={Gtk.Align.START} />
        <combobox
            tooltipText="Select Stable Diffusion model"
            onNotifyActive={() => {
                const combo = this as Gtk.ComboBoxText
                if (!combo) return
                const active = combo.active
                if (active >= 0) setSelectedModel(models[active]?.title ?? "")
            }}
        >
            <button
                class="sdg-refresh-btn"
                onClicked={async () => {
                    try {
                        const ms = await fetchModels()
                        setModels(ms)
                        if (ms.length > 0) {
                            setSelectedModel(ms[0].title)
                        }
                    } catch {
                        setModels([])
                    }
                    setReady(true)
                }}
            >
                <label label="󰑓" />
            </button>
        </combobox>
    </box>
}

function EmbeddingSelector({
    embeddings, setEmbeddings,
    selectedEmbeddings, setSelectedEmbeddings,
}: {
    embeddings: SdEmbedding[]
    setEmbeddings: (e: SdEmbedding[]) => void
    selectedEmbeddings: string[]
    setSelectedEmbeddings: (e: string[]) => void
}) {
    const [checked, setChecked] = createState<Record<string, boolean>>({})

    return <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
        <label class="sdg-label-sm" label="Embeddings" halign={Gtk.Align.START} />
        <scrolledwindow
            hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            heightRequest={80}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={2}
                class="sdg-embed-list"
            >
                <button
                    class="sdg-refresh-btn sdg-embed-refresh"
                    onClicked={async () => {
                        try {
                            const embs = await fetchEmbeddings()
                            setEmbeddings(embs)
                            setChecked({})
                        } catch {
                            setEmbeddings([])
                        }
                    }}
                >
                    <label label="󰑓" />
                </button>
            </box>
        </scrolledwindow>
    </box>
}

function SetupUI({ status }: { status: { status: string; path: string | null } }) {
    return <box orientation={Gtk.Orientation.VERTICAL} spacing={12} class="sdg-setup">
        <box spacing={8} halign={Gtk.Align.CENTER}>
            <label class="sdg-dot sdg-dot-warning" label="●" />
            <label label="WebUI detected but API not running" />
        </box>
        <button
            class="sdg-launch-btn"
            onClicked={() => {
                const cmd = `cd "${status.path?.split("/webui.sh")[0]}" && ./webui.sh --api`
                execAsync(["bash", "-c", cmd]).catch(console.error)
            }}
        >
            <box spacing={6}>
                <label label="▶ Launch WebUI with --api" />
            </box>
        </button>
        <label class="sdg-setup-hint" label="After launching, toggle the sidebar to reconnect." halign={Gtk.Align.CENTER} />
    </box>
}

function NoSetupUI() {
    const { path, installCommand } = checkSetup()

    return <box orientation={Gtk.Orientation.VERTICAL} spacing={12} class="sdg-setup">
        <box spacing={8} halign={Gtk.Align.CENTER}>
            <label class="sdg-dot sdg-dot-error" label="●" />
            <label label="Stable Diffusion WebUI not found" />
        </box>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} class="sdg-install-cmd">
            <label class="sdg-label-sm" label="Install command:" halign={Gtk.Align.START} />
            <label class="sdg-code" label={installCommand ?? ""} wrap halign={Gtk.Align.START} />
        </box>
        <label class="sdg-setup-hint" label="Run the command above, then toggle the sidebar." halign={Gtk.Align.CENTER} />
    </box>
}
