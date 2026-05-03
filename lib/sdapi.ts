import GLib from "gi://GLib"

import { SD_API_URL } from "./sdsetup"

export interface SdModel {
    title: string
    model_name: string
    filename: string
}

export interface SdEmbedding {
    name: string
    filename: string
    shortcut: string[]
}

export interface SdResponse {
    images: string[]
    parameters?: Record<string, unknown>
}

export interface GenerateParams {
    prompt: string
    negative_prompt: string
    steps?: number
    cfg_scale?: number
    width?: number
    height?: number
    sampler_name?: string
    model?: string
    embeddings?: string[]
}

export interface GenerateResult {
    previewPath: string
    galleryPath: string
}

export const DEFAULTS = {
    steps: 20,
    cfg_scale: 7,
    width: 512,
    height: 512,
    sampler_name: "Euler a",
}

export function buildEmbeddingsPrompt(embeddings: string[]): string {
    return embeddings
        .map((e) => `(embedding:${e}:1.0)`)
        .join(", ")
}

export function enrichPrompt(prompt: string, embeddings: string[]): string {
    if (!embeddings || embeddings.length === 0) return prompt
    return `${buildEmbeddingsPrompt(embeddings)} ${prompt}`
}

export function buildRequestBody(params: GenerateParams): Record<string, unknown> {
    const enhancedPrompt = enrichPrompt(params.prompt, params.embeddings ?? [])

    const body: Record<string, unknown> = {
        prompt: enhancedPrompt,
        negative_prompt: params.negative_prompt,
        steps: params.steps ?? DEFAULTS.steps,
        cfg_scale: params.cfg_scale ?? DEFAULTS.cfg_scale,
        width: params.width ?? DEFAULTS.width,
        height: params.height ?? DEFAULTS.height,
        sampler_name: params.sampler_name ?? DEFAULTS.sampler_name,
    }

    if (params.model) {
        body.override_settings = { sd_model_checkpoint: params.model }
    }

    return body
}

export function parseSdResponse(data: unknown): { success: boolean; b64: string } {
    const d = data as SdResponse
    if (!d.images?.[0]) {
        return { success: false, b64: "" }
    }
    return { success: true, b64: d.images[0] }
}

export function buildPreviewPath(): string {
    return `${GLib.get_tmp_dir()}/sidebar-sd-preview.png`
}

export function buildGalleryPath(): { path: string; dir: string } {
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const galleryDir = `${GLib.get_home_dir()}/Pictures/SID-Gallery`
    return {
        path: `${galleryDir}/sd-${ts}.png`,
        dir: galleryDir,
    }
}

export function buildMkdirCommand(dir: string): string {
    return `mkdir -p "${dir}"`
}

async function fetchModels(): Promise<SdModel[]> {
    const res = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`)
    if (!res.ok) return []
    return (await res.json()) as SdModel[]
}

async function fetchEmbeddings(): Promise<SdEmbedding[]> {
    const res = await fetch(`${SD_API_URL}/sdapi/v1/embeddings`)
    if (!res.ok) return []
    return (await res.json()) as SdEmbedding[]
}

async function generateImage(params: GenerateParams): Promise<GenerateResult> {
    const body = buildRequestBody(params)

    const res = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`SD API error: ${res.status} ${res.statusText} — ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const parsed = parseSdResponse(data)
    if (!parsed.success) {
        throw new Error("No image returned from SD API")
    }

    const b64 = parsed.b64
    const bytes = GLib.base64_decode(b64)

    const previewPath = buildPreviewPath()
    GLib.file_set_contents(previewPath, bytes)

    const { path: galleryPath, dir: galleryDir } = buildGalleryPath()

    const mkdir = buildMkdirCommand(galleryDir)
    const [ok1] = GLib.spawn_command_line_sync(mkdir)
    if (ok1) {
        GLib.file_set_contents(galleryPath, bytes)
    }

    return { previewPath, galleryPath }
}

export { fetchModels, fetchEmbeddings, generateImage }
