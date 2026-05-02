import App from "ags/gtk4/app"
import GLib from "gi://GLib"
import Sidebar from "./widget/Sidebar"

const CSS = `${GLib.get_home_dir()}/sidebar/style.css`

App.start({
    instanceName: "sidebar",
    css: CSS,
    requestHandler(argv: string[], res: (response: string) => void) {
        const win = App.get_window("sidebar")
        if (argv[0] === "toggle") {
            win?.set_visible(!win.visible)
            res("ok")
        } else if (argv[0] === "open") {
            win?.set_visible(true)
            res("ok")
        } else if (argv[0] === "close") {
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
