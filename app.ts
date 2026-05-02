import { App } from "astal/gtk4"
import GLib from "gi://GLib"
import Sidebar from "./widget/Sidebar"

const CSS = `${GLib.get_home_dir()}/sidebar/style.css`

App.start({
    instanceName: "sidebar",
    css: CSS,
    requestHandler(request: string, res: (response: string) => void) {
        const win = App.get_window("sidebar")
        if (request === "toggle") {
            win?.set_visible(!win.visible)
            res("ok")
        } else if (request === "open") {
            win?.set_visible(true)
            res("ok")
        } else if (request === "close") {
            win?.set_visible(false)
            res("ok")
        } else {
            res("unknown request")
        }
    },
    main() {
        Sidebar()
    },
})
