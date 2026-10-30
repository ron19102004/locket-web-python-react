#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================="
echo "  Đang khởi chạy Locket Web (macOS VENV)..."
echo "========================================================="

PY_BIN=""
if [ -f "$DIR/venv/bin/python" ]; then
    PY_BIN="$DIR/venv/bin/python"
elif [ -f "$DIR/venv/bin/python3" ]; then
    PY_BIN="$DIR/venv/bin/python3"
fi

if [ -n "$PY_BIN" ]; then
    source "$DIR/venv/bin/activate" 2>/dev/null || true
    # Kiểm tra thư viện trong requirements.txt
    if ! "$PY_BIN" -c "import flask, flask_cors, requests, PIL" &> /dev/null; then
        echo "[!] Đang cài đặt các thư viện từ requirements.txt vào venv..."
        "$PY_BIN" -m pip install -r requirements.txt
    fi
    exec "$PY_BIN" app.py "$@"
else
    echo "⚠️ Không tìm thấy venv tại $DIR/venv"
    echo "Đang thử chạy bằng python3 hệ thống..."
    if ! python3 -c "import flask, flask_cors, requests, PIL" &> /dev/null; then
        echo "[!] Đang cài đặt thư viện từ requirements.txt..."
        python3 -m pip install -r requirements.txt
    fi
    exec python3 app.py "$@"
fi
