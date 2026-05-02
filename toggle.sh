#!/usr/bin/env bash
# Toggle the sidebar — starts it if not running, toggles if it is
if ags -i sidebar request toggle 2>/dev/null; then
    exit 0
fi
# Not running — start it in the background
ags run "$HOME/sidebar/app.ts" &
