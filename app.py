#!/usr/bin/env python3
"""
=============================================================================
🚀 LOCKET WEB APPLICATION (Fullstack Python + React TypeScript)
=============================================================================
Backend: Flask REST API + Caching Engine
Frontend: React 18 + TypeScript + Vite (macOS 27 Liquid Glass UI)
Direct run: python app.py or py app.py
=============================================================================
"""

import os
import sys
import json
import time
import socket
import tempfile
import threading
import webbrowser
from datetime import datetime
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from locket_api import LocketAPI

# =============================================================================
# CẤU HÌNH ĐƯỜNG DẪN THƯ MỤC & DỮ LIỆU CỤC BỘ
# =============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
CACHE_DIR = os.path.join(BASE_DIR, "cached_moments")
MOMENTS_CACHE_FILE = os.path.join(BASE_DIR, ".locket_moments_cache.json")
SESSION_FILE = os.path.join(BASE_DIR, ".locket_session.json")

os.makedirs(CACHE_DIR, exist_ok=True)

# Khởi tạo API Client
api = LocketAPI(session_file=SESSION_FILE)

# Khởi tạo Flask App
app = Flask(__name__, static_folder=DIST_DIR, static_url_path="")
CORS(app)

# =============================================================================
# TIỆN ÍCH BỘ NHỚ ĐỆM (CACHE ENGINE)
# =============================================================================
def load_moments_cache():
    """Tải toàn bộ khoảnh khắc và hồ sơ bạn bè từ tệp JSON cục bộ."""
    if os.path.exists(MOMENTS_CACHE_FILE):
        try:
            with open(MOMENTS_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[CACHE] Lỗi đọc cache: {e}")
    return {"moments": {}, "users": {}}

def save_moments_cache(cache_data):
    """Lưu trữ bền vững khoảnh khắc và hồ sơ bạn bè vào tệp JSON."""
    try:
        with open(MOMENTS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[CACHE] Lỗi lưu cache: {e}")

def cache_image_locally(url, filename):
    """
    Tải ảnh về thư mục cục bộ ./cached_moments/ nếu chưa có.
    Trả về đường dẫn web tương đối /cached_moments/<filename> để trình duyệt tải siêu tốc.
    """
    if not url:
        return None
    file_path = os.path.join(CACHE_DIR, filename)

    # Nếu tệp đã tồn tại và có dung lượng hợp lệ, dùng ngay
    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        return f"/cached_moments/{filename}"

    # Tải ngầm về máy tính
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            with open(file_path, "wb") as f:
                f.write(r.content)
            return f"/cached_moments/{filename}"
    except Exception as e:
        print(f"[CACHE] Không thể nạp ảnh {url}: {e}")
    return url

def clear_local_cache():
    """Xóa toàn bộ tệp ảnh trong cached_moments và đặt lại file cache JSON."""
    try:
        if os.path.exists(CACHE_DIR):
            for f in os.listdir(CACHE_DIR):
                p = os.path.join(CACHE_DIR, f)
                if os.path.isfile(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass
        save_moments_cache({"moments": {}, "users": {}})
        return True, "Dọn sạch cache thành công"
    except Exception as e:
        return False, str(e)

# =============================================================================
# REST API ENDPOINTS
# =============================================================================

@app.route("/api/status", methods=["GET"])
def get_status():
    """Lấy trạng thái xác thực và hồ sơ người dùng."""
    logged = api.is_logged_in()
    if logged:
        try:
            api.ensure_valid_token()
            if not api.user_profile.get("profile_picture_url"):
                api.fetch_self_profile()
        except Exception as e:
            print(f"[API] Lỗi kiểm tra token: {e}")

    # Đảm bảo avatar local nếu có
    profile = dict(api.user_profile or {})
    av_url = profile.get("profile_picture_url") or profile.get("profile_picture")
    if av_url and api.user_id:
        local_av = cache_image_locally(av_url, f"avatar_{api.user_id}.webp")
        if local_av:
            profile["local_avatar_url"] = local_av

    return jsonify({
        "logged_in": logged,
        "email": api.email,
        "user_id": api.user_id,
        "user_profile": profile
    })

@app.route("/api/login", methods=["POST"])
def login():
    """Đăng nhập bằng email và mật khẩu tài khoản Locket."""
    data = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"ok": False, "msg": "Vui lòng nhập đầy đủ email và mật khẩu"}), 400

    ok, msg = api.login_with_email(email, password)
    profile = {}
    if ok:
        try:
            profile = api.fetch_self_profile() or {}
        except Exception:
            pass

    return jsonify({
        "ok": ok,
        "msg": msg,
        "user_profile": profile
    })

@app.route("/api/logout", methods=["POST"])
def logout():
    """Đăng xuất, xóa phiên lưu trữ và dọn bộ nhớ đệm."""
    api.clear_session()
    clear_local_cache()
    return jsonify({"ok": True, "msg": "Đã đăng xuất"})

@app.route("/api/feed", methods=["GET"])
def get_feed():
    """
    Lấy danh sách khoảnh khắc:
    1. Đọc khoảnh khắc từ tệp cache cục bộ.
    2. Nạp thêm khoảnh khắc mới nhất từ máy chủ Locket (nếu đã đăng nhập).
    3. Tự động lưu trữ ảnh về ./cached_moments/ để tải tức thì 0ms.
    """
    if not api.is_logged_in():
        return jsonify({
            "ok": False,
            "msg": "Chưa đăng nhập",
            "data": {"moments": [], "users": {}}
        })

    moments_cache = load_moments_cache()
    cached_moments = moments_cache.get("moments", {})
    cached_users = moments_cache.get("users", {})

    # Lấy danh sách bạn bè chính thức
    official_friends = api.get_friend_uids()
    allowed_uids = set(official_friends)
    if api.user_id:
        allowed_uids.add(api.user_id)

    # Nạp từ Locket Server
    try:
        ok, res = api.get_latest_moments(max_friends=35)
        if ok and res:
            new_moments = res.get("moments", [])
            new_users = res.get("users", {})

            for uid, udata in new_users.items():
                if allowed_uids and uid not in allowed_uids:
                    continue
                if uid not in cached_users:
                    cached_users[uid] = udata
                else:
                    cached_users[uid].update(udata)

            for m in new_moments:
                cid = m.get("canonical_uid")
                u = m.get("user")
                if allowed_uids and u not in allowed_uids:
                    continue
                if cid:
                    cached_moments[cid] = m
    except Exception as e:
        print(f"[API] Lỗi nạp khoảnh khắc từ Locket: {e}")

    # Lọc nghiêm ngặt bạn bè chính thức
    if allowed_uids:
        cached_moments = {cid: m for cid, m in cached_moments.items() if m.get("user") in allowed_uids}
        cached_users = {uid: u for uid, u in cached_users.items() if uid in allowed_uids}

    # Sắp xếp theo thời gian mới nhất (giảm dần)
    def get_moment_time(m):
        d = m.get("date")
        if isinstance(d, dict) and "_seconds" in d:
            return float(d["_seconds"]) + float(d.get("_nanoseconds", 0)) / 1e9
        elif isinstance(d, (int, float)):
            return float(d)
        return 0.0

    sorted_moments = list(cached_moments.values())
    sorted_moments.sort(key=get_moment_time, reverse=True)

    # Cache ảnh cục bộ & gán đường dẫn web
    for m in sorted_moments:
        cid = m.get("canonical_uid")
        url = m.get("thumbnail_url") or m.get("video_url")
        if cid and url:
            local_url = cache_image_locally(url, f"{cid}.webp")
            if local_url:
                m["local_cached_url"] = local_url

    # Cache avatar bạn bè
    for uid, u in cached_users.items():
        av_url = u.get("profile_picture_url") or u.get("profile_picture")
        if uid and av_url and "data:image" not in av_url:
            local_av = cache_image_locally(av_url, f"avatar_{uid}.webp")
            if local_av:
                u["local_avatar_url"] = local_av

    # Lưu lại cache
    moments_cache["moments"] = cached_moments
    moments_cache["users"] = cached_users
    save_moments_cache(moments_cache)

    return jsonify({
        "ok": True,
        "data": {
            "moments": sorted_moments,
            "users": cached_users
        }
    })

@app.route("/api/post_moment", methods=["POST"])
def post_moment():
    """
    Đăng khoảnh khắc mới lên Locket:
    Nhận tệp ảnh từ multipart/form-data hoặc base64, nén WebP và tải lên Firebase Storage.
    """
    if not api.is_logged_in():
        return jsonify({"ok": False, "msg": "Chưa đăng nhập!"}), 401

    caption = request.form.get("caption", "").strip()
    sent_to_all_val = request.form.get("sent_to_all", "true").lower() in ("true", "1", "yes")

    file = request.files.get("image")
    if not file:
        return jsonify({"ok": False, "msg": "Không tìm thấy tệp ảnh tải lên"}), 400

    # Lưu tệp tạm thời
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        temp_path = tmp.name

    try:
        ok, res = api.post_moment(temp_path, caption=caption, sent_to_all=sent_to_all_val)
        if ok and res:
            moment_data = res.get("data") or res.get("moment") or {}
            cid = moment_data.get("canonical_uid")
            if cid:
                moments_cache = load_moments_cache()
                moments_cache.setdefault("moments", {})[cid] = moment_data
                save_moments_cache(moments_cache)
            return jsonify({"ok": True, "data": res})
        return jsonify({"ok": False, "msg": str(res)})
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

@app.route("/api/delete_moment", methods=["POST"])
def delete_moment():
    """Xóa một khoảnh khắc theo moment_uid."""
    data = request.get_json(force=True, silent=True) or {}
    moment_uid = data.get("moment_uid")
    if not moment_uid:
        return jsonify({"ok": False, "msg": "Thiếu moment_uid"}), 400

    ok, msg = api.delete_moment(moment_uid)
    if ok:
        moments_cache = load_moments_cache()
        if moment_uid in moments_cache.get("moments", {}):
            del moments_cache["moments"][moment_uid]
            save_moments_cache(moments_cache)
    return jsonify({"ok": ok, "msg": msg})

@app.route("/api/cache_info", methods=["GET"])
def get_cache_info():
    """Thống kê chi tiết bộ nhớ đệm cục bộ."""
    try:
        files = [f for f in os.listdir(CACHE_DIR) if os.path.isfile(os.path.join(CACHE_DIR, f))]
        total_size = sum(os.path.getsize(os.path.join(CACHE_DIR, f)) for f in files)
        moments_cache = load_moments_cache()
        return jsonify({
            "file_count": len(files),
            "size_mb": round(total_size / (1024 * 1024), 2),
            "moments_count": len(moments_cache.get("moments", {})),
            "cache_dir": CACHE_DIR
        })
    except Exception as e:
        return jsonify({"file_count": 0, "size_mb": 0, "moments_count": 0, "error": str(e)})

@app.route("/api/clear_cache", methods=["POST"])
def clear_cache():
    """Xóa toàn bộ bộ nhớ đệm ảnh và reset file JSON."""
    ok, msg = clear_local_cache()
    return jsonify({"ok": ok, "msg": msg})

# =============================================================================
# STATIC SERVING: CACHED IMAGES & REACT FRONTEND
# =============================================================================

@app.route("/cached_moments/<path:filename>")
def serve_cached_moments(filename):
    """Phục vụ trực tiếp ảnh đã lưu trong cached_moments/ với HTTP Cache header."""
    res = send_from_directory(CACHE_DIR, filename)
    res.headers["Cache-Control"] = "public, max-age=604800, immutable"
    return res

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    """Phục vụ ảnh hoặc tài nguyên trong thư mục assets/ hoặc dist/assets/."""
    # Kiểm tra trong dist/assets trước (bundle từ frontend Vite)
    dist_asset = os.path.join(DIST_DIR, "assets", filename)
    if os.path.exists(dist_asset) and os.path.isfile(dist_asset):
        return send_from_directory(os.path.join(DIST_DIR, "assets"), filename)
    # Kiểm tra trong thư mục assets/ gốc
    root_asset = os.path.join(ASSETS_DIR, filename)
    if os.path.exists(root_asset) and os.path.isfile(root_asset):
        return send_from_directory(ASSETS_DIR, filename)
    return "Not found", 404

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Phục vụ file tĩnh từ bản build React trong thư mục dist/ (hỗ trợ SPA routing)."""
    full_path = os.path.join(DIST_DIR, path)
    if path and os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(DIST_DIR, path)

    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(DIST_DIR, "index.html")

    return (
        "<div style='font-family:sans-serif;text-align:center;padding:50px;background:#08090d;color:#fff;min-height:100vh;'>"
        "<h1>⚠️ Frontend chưa được build</h1>"
        "<p>Vui lòng chuyển vào thư mục <code>frontend</code> và chạy <code>npm run build</code>.</p>"
        "</div>",
        404
    )

# =============================================================================
# KHỞI CHẠY MÁY CHỦ & TỰ ĐỘNG MỞ TRÌNH DUYỆT
# =============================================================================

def find_available_port(start_port=5001, max_attempts=20):
    """Tìm cổng TCP còn trống để tránh xung đột cổng."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port

def open_browser_delayed(url, delay_seconds=0.8):
    """Mở trình duyệt sau khi máy chủ khởi động hoàn tất."""
    def _open():
        time.sleep(delay_seconds)
        try:
            webbrowser.open(url)
        except Exception:
            pass
    t = threading.Thread(target=_open, daemon=True)
    t.start()

def print_banner(url):
    logged_user = api.user_profile.get("username") or api.email or "Chưa đăng nhập"
    print("\n" + "=" * 65)
    print("  🚀 LOCKET WEB APPLICATION (React + TypeScript + Python Flask)")
    print("=" * 65)
    print(f"  📡 Địa chỉ Web:      {url}")
    print(f"  👤 Trạng thái:       {logged_user}")
    print(f"  📁 Bản build web:    {DIST_DIR}")
    print(f"  📸 Bộ nhớ đệm ảnh:   {CACHE_DIR}")
    print("=" * 65)
    print("  💡 Nhấn Ctrl + C để dừng máy chủ bất kỳ lúc nào.\n")

def main():
    # Kiểm tra xem dist đã có chưa, nếu chưa có và frontend/package.json có thì thông báo
    if not os.path.exists(os.path.join(DIST_DIR, "index.html")):
        print("[!] Không tìm thấy bản build tại ./dist/. Đang kiểm tra frontend...")
        frontend_dir = os.path.join(BASE_DIR, "frontend")
        if os.path.exists(frontend_dir):
            print("[*] Đang tự động build frontend React TypeScript...")
            os.system(f"cd '{frontend_dir}' && npm run build")

    port = int(os.environ.get("PORT", find_available_port(5001)))
    url = f"http://127.0.0.1:{port}"

    print_banner(url)
    open_browser_delayed(url)

    # Chạy Flask Server
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)

if __name__ == "__main__":
    main()
