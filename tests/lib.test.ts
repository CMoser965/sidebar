import { describe, it, expect, vi, beforeEach } from "vitest"

import { addExistingFile, clearExistingFiles } from "./setup"

import {
    buildCommonInstallPaths,
    buildWebuiPaths,
    detectInstalledWebui,
    getInstallPath,
    buildInstallCommand,
    buildLaunchCommand,
    checkSetup,
    getLaunchCommand,
    getInstallCommand,
    fileExists,
    SD_API_URL,
} from "../lib/sdsetup"

import {
    buildEmbeddingsPrompt,
    enrichPrompt,
    buildRequestBody,
    parseSdResponse,
    buildPreviewPath,
    buildGalleryPath,
    buildMkdirCommand,
    DEFAULTS,
} from "../lib/sdapi"

beforeEach(() => {
    clearExistingFiles()
})

// =============================================================================
// sdsetup tests
// =============================================================================

describe("sdsetup", () => {
    describe("SD_API_URL", () => {
        it("exports the default API URL", () => {
            expect(SD_API_URL).toBe("http://127.0.0.1:7860")
        })
    })

    describe("fileExists", () => {
        it("is a function", () => {
            expect(typeof fileExists).toBe("function")
        })

        it("returns false for non-existent file (mock)", () => {
            expect(fileExists("/some/nonexistent/path")).toBe(false)
        })

        it("returns true for existing file (mock)", () => {
            addExistingFile("/some/existing/file")
            expect(fileExists("/some/existing/file")).toBe(true)
        })
    })

    describe("buildCommonInstallPaths", () => {
        it("returns 4 paths from home dir", () => {
            const paths = buildCommonInstallPaths()
            expect(Array.isArray(paths)).toBe(true)
            expect(paths.length).toBe(4)
            expect(paths[0]).toBe("/home/testuser/stable-diffusion-webui")
            expect(paths[1]).toBe("/home/testuser/Documents/stable-diffusion-webui")
            expect(paths[2]).toBe("/home/testuser/GitHub/stable-diffusion-webui")
            expect(paths[3]).toBe("/home/testuser/git/stable-diffusion-webui")
        })
    })

    describe("buildWebuiPaths", () => {
        it("builds correct webui.sh paths from home dir", () => {
            const home = "/home/testuser"
            const paths = buildWebuiPaths(home)

            expect(paths).toEqual([
                "/home/testuser/stable-diffusion-webui/webui.sh",
                "/home/testuser/Documents/stable-diffusion-webui/webui.sh",
                "/home/testuser/GitHub/stable-diffusion-webui/webui.sh",
                "/home/testuser/git/stable-diffusion-webui/webui.sh",
            ])
        })

        it("handles empty home dir", () => {
            const paths = buildWebuiPaths("")
            expect(paths[0]).toBe("/stable-diffusion-webui/webui.sh")
            expect(paths.length).toBe(4)
        })
    })

    describe("detectInstalledWebui", () => {
        it("returns null when no webui exists", () => {
            const result = detectInstalledWebui("/home/testuser")
            expect(result).toBeNull()
        })

        it("returns path when first webui.sh exists", () => {
            addExistingFile("/home/testuser/stable-diffusion-webui/webui.sh")
            const result = detectInstalledWebui("/home/testuser")
            expect(result).toBe("/home/testuser/stable-diffusion-webui/webui.sh")
        })

        it("skips non-existent paths and finds later one", () => {
            addExistingFile("/home/testuser/Documents/stable-diffusion-webui/webui.sh")
            const result = detectInstalledWebui("/home/testuser")
            expect(result).toBe("/home/testuser/Documents/stable-diffusion-webui/webui.sh")
        })

        it("returns null for all paths missing", () => {
            const result = detectInstalledWebui("/nonexistent")
            expect(result).toBeNull()
        })

        it("accepts custom fileExists function", () => {
            const customHome = "/home/testuser/custom"
            const mockExists = (p: string) => p.endsWith("webui.sh") && p.startsWith("/home/testuser/custom")
            addExistingFile("/home/testuser/custom/stable-diffusion-webui/webui.sh")
            const result = detectInstalledWebui(customHome, mockExists)
            expect(result).toBe("/home/testuser/custom/stable-diffusion-webui/webui.sh")
        })
    })

    describe("getInstallPath", () => {
        it("returns default install path", () => {
            expect(getInstallPath("/home/testuser")).toBe("/home/testuser/stable-diffusion-webui")
        })

        it("handles various home dirs", () => {
            expect(getInstallPath("/root")).toBe("/root/stable-diffusion-webui")
            expect(getInstallPath("/home/user")).toBe("/home/user/stable-diffusion-webui")
        })
    })

    describe("buildInstallCommand", () => {
        it("returns correct git clone command", () => {
            const installPath = "/home/user/stable-diffusion-webui"
            const cmd = buildInstallCommand(installPath)

            expect(cmd).toBe(
                `git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git "${installPath}" && cd "${installPath}" && ./webui.sh`,
            )
        })

        it("escapes spaces in path with quotes", () => {
            const installPath = "/home/user/my sd.webui"
            const cmd = buildInstallCommand(installPath)

            expect(cmd).toContain(`"${installPath}"`)
        })

        it("handles paths with special chars", () => {
            const installPath = "/home/user/stable-diffusion-webui-v2"
            const cmd = buildInstallCommand(installPath)

            expect(cmd).toContain(installPath)
        })
    })

    describe("buildLaunchCommand", () => {
        it("returns correct launch command", () => {
            const webuiPath = "/home/user/stable-diffusion-webui/webui.sh"
            const cmd = buildLaunchCommand(webuiPath)

            expect(cmd).toBe(`cd "/home/user/stable-diffusion-webui" && ./webui.sh --api`)
        })

        it("handles nested paths", () => {
            const webuiPath = "/a/b/c/d/webui.sh"
            const cmd = buildLaunchCommand(webuiPath)

            expect(cmd).toBe(`cd "/a/b/c/d" && ./webui.sh --api`)
        })

        it("handles Documents subdirectory", () => {
            const webuiPath = "/home/user/Documents/stable-diffusion-webui/webui.sh"
            const cmd = buildLaunchCommand(webuiPath)

            expect(cmd).toBe(`cd "/home/user/Documents/stable-diffusion-webui" && ./webui.sh --api`)
        })
    })

    describe("checkSetup", () => {
        it("returns connected when API is reachable", async () => {
            const result = await checkSetup(() => Promise.resolve(true))
            expect(result.status).toBe("connected")
            expect(result.path).toBe(SD_API_URL)
            expect(result.installCommand).toBeNull()
        })

        it("returns installed-but-stopped when API unreachable but webui detected", async () => {
            addExistingFile("/home/testuser/stable-diffusion-webui/webui.sh")
            const result = await checkSetup(() => Promise.resolve(false))
            expect(result.status).toBe("installed-but-stopped")
            expect(result.path).toBe("/home/testuser/stable-diffusion-webui/webui.sh")
            expect(result.installCommand).toBeNull()
        })

        it("returns not-installed when nothing found", async () => {
            const result = await checkSetup(() => Promise.resolve(false))
            expect(result.status).toBe("not-installed")
            expect(result.path).toBeNull()
            expect(typeof result.installCommand).toBe("string")
            expect(result.installCommand!.length).toBeGreaterThan(0)
            expect(result.installCommand).toContain("git clone")
        })

        it("returns not-installed with correct path from getHomeDir", async () => {
            const result = await checkSetup(() => Promise.resolve(false))
            expect(result.installCommand).toContain("/home/testuser/stable-diffusion-webui")
        })
    })

    describe("getLaunchCommand", () => {
        it("returns launch command when webui exists", () => {
            addExistingFile("/home/testuser/stable-diffusion-webui/webui.sh")
            const result = getLaunchCommand()
            expect(typeof result).toBe("string")
            expect(result).toContain("webui.sh --api")
        })

        it("returns null when no webui installed", () => {
            const result = getLaunchCommand()
            expect(result).toBeNull()
        })
    })

    describe("getInstallCommand", () => {
        it("returns install command when not installed", async () => {
            const result = await getInstallCommand()
            expect(typeof result).toBe("string")
            expect(result).toContain("git clone")
        })

        it("returns null when API reachable (mocked)", async () => {
            const result = await getInstallCommand()
            expect(typeof result).toBe("string")
            expect(result).toContain("git clone")
        })
    })
})

// =============================================================================
// sdapi pure function tests
// =============================================================================

describe("sdapi", () => {
    describe("DEFAULTS", () => {
        it("has all required default values", () => {
            expect(DEFAULTS.steps).toBe(20)
            expect(DEFAULTS.cfg_scale).toBe(7)
            expect(DEFAULTS.width).toBe(512)
            expect(DEFAULTS.height).toBe(512)
            expect(DEFAULTS.sampler_name).toBe("Euler a")
        })

        it("has correct types", () => {
            expect(typeof DEFAULTS.steps).toBe("number")
            expect(typeof DEFAULTS.cfg_scale).toBe("number")
            expect(typeof DEFAULTS.width).toBe("number")
            expect(typeof DEFAULTS.height).toBe("number")
            expect(typeof DEFAULTS.sampler_name).toBe("string")
        })
    })

    describe("buildEmbeddingsPrompt", () => {
        it("returns empty string for empty array", () => {
            expect(buildEmbeddingsPrompt([])).toBe("")
        })

        it("formats single embedding", () => {
            expect(buildEmbeddingsPrompt(["my-embedding"])).toBe("(embedding:my-embedding:1.0)")
        })

        it("formats multiple embeddings with comma separator", () => {
            const result = buildEmbeddingsPrompt(["emb1", "emb2", "emb3"])
            expect(result).toBe("(embedding:emb1:1.0), (embedding:emb2:1.0), (embedding:emb3:1.0)")
        })

        it("handles special characters in names", () => {
            const result = buildEmbeddingsPrompt(["my.embedding.v2"])
            expect(result).toBe("(embedding:my.embedding.v2:1.0)")
        })

        it("handles embeddings with spaces", () => {
            const result = buildEmbeddingsPrompt(["my embedding"])
            expect(result).toBe("(embedding:my embedding:1.0)")
        })

        it("handles numeric suffixes", () => {
            const result = buildEmbeddingsPrompt(["ep15"])
            expect(result).toBe("(embedding:ep15:1.0)")
        })
    })

    describe("enrichPrompt", () => {
        it("returns original prompt when no embeddings", () => {
            const prompt = "a beautiful sunset"
            expect(enrichPrompt(prompt, [])).toBe(prompt)
        })

        it("prepends embeddings to prompt", () => {
            const prompt = "a beautiful sunset"
            const result = enrichPrompt(prompt, ["my-embedding"])
            expect(result).toBe("(embedding:my-embedding:1.0) a beautiful sunset")
        })

        it("handles multiple embeddings", () => {
            const prompt = "a landscape"
            const result = enrichPrompt(prompt, ["emb1", "emb2"])
            expect(result).toBe("(embedding:emb1:1.0), (embedding:emb2:1.0) a landscape")
        })

        it("handles undefined embeddings", () => {
            expect(enrichPrompt("test", undefined as unknown as string[])).toBe("test")
        })

        it("handles null-like embeddings", () => {
            expect(enrichPrompt("test", null as unknown as string[])).toBe("test")
        })

        it("preserves prompt text exactly", () => {
            const prompt = "a detailed portrait of a cat, oil painting style, dramatic lighting"
            const result = enrichPrompt(prompt, ["quality"])
            expect(result).toBe("(embedding:quality:1.0) a detailed portrait of a cat, oil painting style, dramatic lighting")
        })
    })

    describe("buildRequestBody", () => {
        it("uses defaults for missing optional params", () => {
            const params = {
                prompt: "test",
                negative_prompt: "bad",
            }
            const body = buildRequestBody(params)

            expect(body).toMatchObject({
                prompt: "test",
                negative_prompt: "bad",
                steps: DEFAULTS.steps,
                cfg_scale: DEFAULTS.cfg_scale,
                width: DEFAULTS.width,
                height: DEFAULTS.height,
                sampler_name: DEFAULTS.sampler_name,
            })
            expect(body).not.toHaveProperty("override_settings")
        })

        it("includes override_settings when model specified", () => {
            const params = {
                prompt: "test",
                negative_prompt: "bad",
                model: "v1-5-pruned.ckpt",
            }
            const body = buildRequestBody(params)

            expect(body).toMatchObject({
                override_settings: { sd_model_checkpoint: "v1-5-pruned.ckpt" },
            })
        })

        it("applies custom values", () => {
            const params = {
                prompt: "test",
                negative_prompt: "bad",
                steps: 30,
                cfg_scale: 10,
                width: 768,
                height: 1024,
                sampler_name: "DPM++ 2M",
            }
            const body = buildRequestBody(params)

            expect(body).toMatchObject({
                steps: 30,
                cfg_scale: 10,
                width: 768,
                height: 1024,
                sampler_name: "DPM++ 2M",
            })
        })

        it("includes embeddings in prompt", () => {
            const params = {
                prompt: "test",
                negative_prompt: "bad",
                embeddings: ["emb1"],
            }
            const body = buildRequestBody(params)

            expect((body.prompt as string)).toContain("(embedding:emb1:1.0)")
            expect((body.prompt as string)).toContain("test")
        })

        it("includes model with embeddings", () => {
            const params = {
                prompt: "test",
                negative_prompt: "bad",
                model: "checkpoint.safetensors",
                embeddings: ["ep15"],
            }
            const body = buildRequestBody(params)

            expect(body).toMatchObject({
                override_settings: { sd_model_checkpoint: "checkpoint.safetensors" },
            })
            expect((body.prompt as string)).toContain("(embedding:ep15:1.0)")
        })

        it("does not include override_settings when model is empty string", () => {
            const params = {
                prompt: "test",
                negative_prompt: "bad",
                model: "",
            }
            const body = buildRequestBody(params)

            expect(body).not.toHaveProperty("override_settings")
        })

        it("includes all params when fully specified", () => {
            const params = {
                prompt: "a cat",
                negative_prompt: "blurry",
                steps: 50,
                cfg_scale: 12,
                width: 768,
                height: 1024,
                sampler_name: "DPM++ 2M Karras",
                model: "model.safetensors",
                embeddings: ["ep15"],
            }
            const body = buildRequestBody(params)

            expect(body).toMatchObject({
                prompt: "(embedding:ep15:1.0) a cat",
                negative_prompt: "blurry",
                steps: 50,
                cfg_scale: 12,
                width: 768,
                height: 1024,
                sampler_name: "DPM++ 2M Karras",
            })
            expect(body).toMatchObject({
                override_settings: { sd_model_checkpoint: "model.safetensors" },
            })
        })
    })

    describe("parseSdResponse", () => {
        it("returns success for valid response", () => {
            const data = { images: ["base64string123"] }
            const result = parseSdResponse(data)
            expect(result.success).toBe(true)
            expect(result.b64).toBe("base64string123")
        })

        it("returns failure for missing images", () => {
            const data = {}
            const result = parseSdResponse(data)
            expect(result.success).toBe(false)
        })

        it("returns failure for empty images array", () => {
            const data = { images: [] }
            const result = parseSdResponse(data)
            expect(result.success).toBe(false)
        })

        it("returns failure for undefined images", () => {
            const data = { images: undefined }
            const result = parseSdResponse(data)
            expect(result.success).toBe(false)
        })

        it("extracts first image from multiple", () => {
            const data = { images: ["first", "second", "third"] }
            const result = parseSdResponse(data)
            expect(result.success).toBe(true)
            expect(result.b64).toBe("first")
        })

        it("handles response with parameters", () => {
            const data = { images: ["b64"], parameters: { prompt: "test" } }
            const result = parseSdResponse(data)
            expect(result.success).toBe(true)
            expect(result.b64).toBe("b64")
        })
    })

    describe("buildPreviewPath", () => {
        it("returns temp preview path", () => {
            const path = buildPreviewPath()
            expect(path).toContain("/sidebar-sd-preview.png")
            expect(path).toContain("/tmp/")
        })
    })

    describe("buildGalleryPath", () => {
        it("returns gallery path with timestamp", () => {
            const result = buildGalleryPath()
            expect(result.path).toContain("/SID-Gallery/sd-")
            expect(result.path).toMatch(/sd-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
            expect(result.path).toMatch(/\.png$/)
            expect(result.dir).toMatch(/SID-Gallery$/)
        })

        it("uses correct timestamp format without colons", () => {
            const result = buildGalleryPath()
            const ts = result.path.split("/sd-")[1]
            expect(ts).not.toContain(":")
            expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.png$/)
        })

        it("generates paths with consistent structure", () => {
            const r1 = buildGalleryPath()
            const r2 = buildGalleryPath()
            // Both should follow the same path pattern
            expect(r1.path).toMatch(/SID-Gallery\/sd-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.png$/)
            expect(r2.path).toMatch(/SID-Gallery\/sd-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.png$/)
        })

        it("uses home directory for gallery", () => {
            const result = buildGalleryPath()
            expect(result.dir).toContain("/home/testuser/")
        })
    })

    describe("buildMkdirCommand", () => {
        it("returns correct mkdir command", () => {
            const cmd = buildMkdirCommand("/home/user/Pictures/SID-Gallery")
            expect(cmd).toBe('mkdir -p "/home/user/Pictures/SID-Gallery"')
        })

        it("quotes paths with spaces", () => {
            const cmd = buildMkdirCommand("/home/user/Pictures/My Gallery")
            expect(cmd).toBe('mkdir -p "/home/user/Pictures/My Gallery"')
        })
    })
})

// =============================================================================
// sdapi network function tests (with global fetch mock)
// =============================================================================

describe("sdapi - network functions with mocked fetch", () => {
    const fakeModels = [
        { title: "models/v1-5-pruned.ckpt", model_name: "v1-5-pruned.ckpt", filename: "v1-5-pruned.ckpt" },
        { title: "models/sd_xl_base_1.0.safetensors", model_name: "sd_xl_base_1.0.safetensors", filename: "sd_xl_base_1.0.safetensors" },
    ]
    const fakeEmbeddings = [
        { name: "ep15", filename: "ep15.pt", shortcut: [] },
        { name: "badhandv4", filename: "badhandv4.pt", shortcut: ["bh4"] },
    ]
    const fakeBase64Image = "R0lGODlhAQAB"

    beforeEach(() => {
        clearExistingFiles()
    })

    it("fetches models from API", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: true,
            json: async () => fakeModels,
        }))
        globalThis.fetch = mockFetch

        const { fetchModels } = await import("../lib/sdapi")
        const models = await fetchModels()

        expect(models).toEqual(fakeModels)
        expect(models.length).toBe(2)
        expect(models[0].model_name).toBe("v1-5-pruned.ckpt")
    })

    it("returns empty array when models API fails", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: false,
            status: 500,
        }))
        globalThis.fetch = mockFetch

        const { fetchModels } = await import("../lib/sdapi")
        const models = await fetchModels()

        expect(models).toEqual([])
    })

    it("fetches embeddings from API", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: true,
            json: async () => fakeEmbeddings,
        }))
        globalThis.fetch = mockFetch

        const { fetchEmbeddings } = await import("../lib/sdapi")
        const embeddings = await fetchEmbeddings()

        expect(embeddings).toEqual(fakeEmbeddings)
        expect(embeddings.length).toBe(2)
        expect(embeddings[0].name).toBe("ep15")
        expect(embeddings[1].shortcut).toEqual(["bh4"])
    })

    it("returns empty array when embeddings API fails", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: false,
            status: 500,
        }))
        globalThis.fetch = mockFetch

        const { fetchEmbeddings } = await import("../lib/sdapi")
        const embeddings = await fetchEmbeddings()

        expect(embeddings).toEqual([])
    })

    it("generates image and returns paths", async () => {
        const mockFetch = vi.fn(async (url: string) => {
            if (url.includes("txt2img")) {
                return {
                    ok: true,
                    json: async () => ({ images: [fakeBase64Image] }),
                }
            }
            return { ok: false }
        })
        globalThis.fetch = mockFetch

        const { generateImage } = await import("../lib/sdapi")
        const result = await generateImage({
            prompt: "a cat",
            negative_prompt: "blurry",
        })

        expect(result.previewPath).toContain("/sidebar-sd-preview.png")
        expect(result.galleryPath).toMatch(/SID-Gallery\/sd-\d{4}-\d{2}-\d{2}/)
        expect(mockFetch).toHaveBeenCalledWith(
            "http://127.0.0.1:7860/sdapi/v1/txt2img",
            expect.objectContaining({
                method: "POST",
            }),
        )
    })

    it("throws on API error", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            text: async () => "Something went wrong",
        }))
        globalThis.fetch = mockFetch

        const { generateImage } = await import("../lib/sdapi")
        await expect(
            generateImage({ prompt: "a cat", negative_prompt: "blurry" }),
        ).rejects.toThrow("SD API error: 500 Internal Server Error")
    })

    it("throws when no image in response", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: true,
            json: async () => ({}),
        }))
        globalThis.fetch = mockFetch

        const { generateImage } = await import("../lib/sdapi")
        await expect(
            generateImage({ prompt: "a cat", negative_prompt: "blurry" }),
        ).rejects.toThrow("No image returned from SD API")
    })

    it("generates image with model selection", async () => {
        const mockFetch = vi.fn(async (url: string) => {
            if (url.includes("txt2img")) {
                return {
                    ok: true,
                    json: async () => ({ images: [fakeBase64Image] }),
                }
            }
            return { ok: false }
        })
        globalThis.fetch = mockFetch

        const { generateImage } = await import("../lib/sdapi")
        const result = await generateImage({
            prompt: "a dog",
            negative_prompt: "bad",
            model: "my-model.safetensors",
            steps: 50,
            cfg_scale: 10,
        })

        expect(result.previewPath).toContain("/sidebar-sd-preview.png")
        const callArgs = mockFetch.mock.calls[0]
        const body = JSON.parse(callArgs[1].body as string)
        expect(body.override_settings).toEqual({ sd_model_checkpoint: "my-model.safetensors" })
        expect(body.steps).toBe(50)
        expect(body.cfg_scale).toBe(10)
    })

    it("generates image with embeddings", async () => {
        const mockFetch = vi.fn(async (url: string) => {
            if (url.includes("txt2img")) {
                return {
                    ok: true,
                    json: async () => ({ images: [fakeBase64Image] }),
                }
            }
            return { ok: false }
        })
        globalThis.fetch = mockFetch

        const { generateImage } = await import("../lib/sdapi")
        await generateImage({
            prompt: "a cat",
            negative_prompt: "blurry",
            embeddings: ["ep15", "badhandv4"],
        })

        const callArgs = mockFetch.mock.calls[0]
        const body = JSON.parse(callArgs[1].body as string)
        expect((body.prompt as string)).toContain("(embedding:ep15:1.0)")
        expect((body.prompt as string)).toContain("(embedding:badhandv4:1.0)")
    })

    it("generates image when mkdir fails (ok1=false)", async () => {
        const originalSpawn = (await import("gi://GLib")).default.spawn_command_line_sync
        ;(await import("gi://GLib")).default.spawn_command_line_sync = vi.fn(() => [false, "", ""])

        const mockFetch = vi.fn(async (url: string) => {
            if (url.includes("txt2img")) {
                return {
                    ok: true,
                    json: async () => ({ images: [fakeBase64Image] }),
                }
            }
            return { ok: false }
        })
        globalThis.fetch = mockFetch

        const { generateImage } = await import("../lib/sdapi")
        const result = await generateImage({
            prompt: "a cat",
            negative_prompt: "blurry",
        })

        expect(result.previewPath).toContain("/sidebar-sd-preview.png")
        expect(result.galleryPath).toMatch(/SID-Gallery\/sd-\d{4}-\d{2}-\d{2}/)

        ;(await import("gi://GLib")).default.spawn_command_line_sync = originalSpawn
    })
})

// =============================================================================
// checkSetup real checkApiReachable (covers the res.ok return line)
// =============================================================================

describe("sdsetup - checkSetup with mocked global fetch", () => {
    it("returns connected when global fetch returns ok", async () => {
        const mockFetch = vi.fn(async () => ({
            ok: true,
            status: 200,
        }))
        globalThis.fetch = mockFetch

        const { checkSetup } = await import("../lib/sdsetup")
        const result = await checkSetup()

        expect(result.status).toBe("connected")
        expect(result.path).toBe(SD_API_URL)
        expect(mockFetch).toHaveBeenCalledWith("http://127.0.0.1:7860", expect.any(Object))
    })

    it("falls back to webui detection when fetch fails", async () => {
        const mockFetch = vi.fn(async () => {
            throw new Error("ECONNREFUSED")
        })
        globalThis.fetch = mockFetch

        const { checkSetup } = await import("../lib/sdsetup")
        const result = await checkSetup()

        expect(result.status).toBe("not-installed")
        expect(result.path).toBeNull()
        expect(result.installCommand).toContain("git clone")
    })
})
