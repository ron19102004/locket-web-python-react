#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================="
echo "  Đang khởi chạy Locket Web (macOS VENV)..."
echo "========================================================="

if [ -f "$DIR/venv/bin/python" ]; then
    source "$DIR/venv/bin/activate" 2>/dev/null || true
    exec "$DIR/venv/bin/python" app.py "$@"
elif [ -f "$DIR/venv/bin/python3" ]; then
    source "$DIR/venv/bin/activate" 2>/dev/null || true
    exec "$DIR/venv/bin/python3" app.py "$@"
else
    echo "⚠️ Không tìm thấy venv tại $DIR/venv"
    echo "Đang thử chạy bằng python3 hệ thống..."
    exec python3 app.py "$@"
fi

