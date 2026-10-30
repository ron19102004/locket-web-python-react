#!/bin/sh
if [ -f "$(dirname "$0")/venv/bin/python" ]; then
    exec "$(dirname "$0")/venv/bin/python" "$@"
else
    exec python3 "$@"
fi

