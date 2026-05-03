import { vi, beforeEach } from "vitest"

const existingFiles = new Set<string>()

// Mock GLib — all GLib functions return safe defaults for testing
vi.mock("gi://GLib", () => ({
    default: {
        get_home_dir: () => "/home/testuser",
        get_tmp_dir: () => "/tmp",
        file_test: (path: string, _flag: number) => existingFiles.has(path),
        base64_decode: () => new Uint8Array([137, 80, 78, 71]),
        file_set_contents: () => true,
        spawn_command_line_sync: () => [true, "", ""],
        FileTest: {
            EXISTS: 1,
        },
    },
}))

beforeEach(() => {
    vi.resetModules()
    existingFiles.clear()
})

export function addExistingFile(path: string) {
    existingFiles.add(path)
}

export function clearExistingFiles() {
    existingFiles.clear()
}
