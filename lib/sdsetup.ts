import GLib from "gi://GLib"

const SD_API_URL = "http://127.0.0.1:7860"

type SetupStatus = "connected" | "installed-but-stopped" | "not-installed"

interface CommonPaths {
    webuiPath: string
    apiCheck: string
    gitInstall: string
    launchCmd: string
}

function getHomeDir(): string {
    return GLib.get_home_dir()
}

function fileExists(path: string): boolean {
    return GLib.file_test(path, GLib.FileTest.EXISTS)
}

async function checkApiReachable(): Promise<boolean> {
    try {
        const res = await fetch(`${SD_API_URL}`, {
            method: "HEAD",
        })
        return Boolean(res.ok)
    } catch {
        return false
    }
}

function buildCommonPaths(homeDir: string): string[] {
    return [
        `${homeDir}/stable-diffusion-webui`,
        `${homeDir}/Documents/stable-diffusion-webui`,
        `${homeDir}/GitHub/stable-diffusion-webui`,
        `${homeDir}/git/stable-diffusion-webui`,
    ]
}

export function buildCommonInstallPaths(): string[] {
    return buildCommonPaths(getHomeDir())
}

export function buildWebuiPaths(homeDir: string): string[] {
    return buildCommonPaths(homeDir).map((p) => `${p}/webui.sh`)
}

export function detectInstalledWebui(homeDir?: string, fileExistsFn?: (p: string) => boolean): string | null {
    const dir = homeDir ?? getHomeDir()
    const exists = fileExistsFn ?? fileExists
    const webuiPaths = buildWebuiPaths(dir)
    for (const path of webuiPaths) {
        if (exists(path)) {
            return path
        }
    }
    return null
}

export function getInstallPath(homeDir: string): string {
    return `${homeDir}/stable-diffusion-webui`
}

export function buildInstallCommand(installPath: string): string {
    return `git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git "${installPath}" && cd "${installPath}" && ./webui.sh`
}

export function buildLaunchCommand(webuiPath: string): string {
    return `cd "${webuiPath.split("/webui.sh")[0]}" && ./webui.sh --api`
}

export async function checkSetup(apiReachable?: () => Promise<boolean>): Promise<{ status: SetupStatus; path: string | null; installCommand: string | null }> {
    const reachable = apiReachable ?? checkApiReachable
    const apiOk = await reachable()
    if (apiOk) {
        return { status: "connected", path: SD_API_URL, installCommand: null }
    }

    const webuiPath = detectInstalledWebui()
    if (webuiPath) {
        return { status: "installed-but-stopped", path: webuiPath, installCommand: null }
    }

    const installPath = getInstallPath(getHomeDir())
    const installCommand = buildInstallCommand(installPath)
    return { status: "not-installed", path: null, installCommand }
}

export function getLaunchCommand(): string | null {
    const webuiPath = detectInstalledWebui()
    if (!webuiPath) return null
    return buildLaunchCommand(webuiPath)
}

export async function getInstallCommand(): Promise<string | null> {
    const result = await checkSetup()
    return result.installCommand
}

export type { SetupStatus, CommonPaths }
export { SD_API_URL, fileExists }
