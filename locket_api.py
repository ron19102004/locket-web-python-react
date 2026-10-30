"""
Locket Camera API Client (Reverse-Engineered from APK com.locket.Locket)
Extracted Firebase Config:
- Project ID: locket-4252a
- Storage Bucket: locket-4252a.appspot.com
- Google API Key: AIzaSyB5dTd-xiLD5dEfWq5OpptnQtnMpE0W0u8
- Base API: https://api.locketcamera.com
"""

import os
import json
import uuid
import time
import io
import requests
from PIL import Image

FIREBASE_API_KEY = "AIzaSyB5dTd-xiLD5dEfWq5OpptnQtnMpE0W0u8"
FIREBASE_PROJECT_ID = "locket-4252a"
STORAGE_BUCKET = "locket-4252a.appspot.com"
API_BASE_URL = "https://api.locketcamera.com"
ANDROID_PACKAGE = "com.locket.Locket"
ANDROID_CERT_SHA1 = "187A27D3D7364A044307F56E66230F973DCCD5B7"
FIREBASE_AUTH_SIGNIN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
FIREBASE_TOKEN_REFRESH_URL = f"https://securetoken.googleapis.com/v1/token?key={FIREBASE_API_KEY}"
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"

DEFAULT_SESSION_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".locket_session.json")

class LocketAPI:
    def __init__(self, session_file=None):
        self.session_file = session_file or DEFAULT_SESSION_FILE
        self.id_token = None
        self.refresh_token = None
        self.user_id = None
        self.email = None
        self.user_profile = {}
        self.token_expiry = 0
        self.session = requests.Session()
        self.load_session()

    def load_session(self):
        """Loads saved session tokens if available."""
        if os.path.exists(self.session_file):
            try:
                with open(self.session_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.id_token = data.get("id_token")
                    self.refresh_token = data.get("refresh_token")
                    self.user_id = data.get("user_id")
                    self.email = data.get("email")
                    self.token_expiry = data.get("token_expiry", 0)
                    self.user_profile = data.get("user_profile", {})
                return True
            except Exception as e:
                print(f"Error loading session: {e}")
        return False

    def save_session(self):
        """Saves current session tokens and profile to local storage."""
        data = {
            "id_token": self.id_token,
            "refresh_token": self.refresh_token,
            "user_id": self.user_id,
            "email": self.email,
            "token_expiry": self.token_expiry,
            "user_profile": self.user_profile
        }
        with open(self.session_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def clear_session(self):
        """Logs out and deletes stored credentials."""
        self.id_token = None
        self.refresh_token = None
        self.user_id = None
        self.email = None
        self.user_profile = {}
        self.token_expiry = 0
        if os.path.exists(self.session_file):
            try:
                os.remove(self.session_file)
            except Exception:
                pass

    def is_logged_in(self):
        return bool(self.id_token and self.user_id)

    def ensure_valid_token(self):
        """Refreshes the ID token if it has expired or is nearing expiration."""
        if not self.refresh_token:
            return False
        
        # If expired or expiring within 60 seconds
        if time.time() >= (self.token_expiry - 60):
            return self.refresh_token_call()
        return True

    def refresh_token_call(self):
        """Refreshes the Firebase ID token using the refresh_token."""
        try:
            payload = {
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token
            }
            headers = {
                "Content-Type": "application/json",
                "X-Android-Package": ANDROID_PACKAGE,
                "X-Android-Cert": ANDROID_CERT_SHA1
            }
            res = self.session.post(FIREBASE_TOKEN_REFRESH_URL, json=payload, headers=headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                self.id_token = data.get("id_token")
                self.refresh_token = data.get("refresh_token", self.refresh_token)
                self.user_id = data.get("user_id", self.user_id)
                expires_in = int(data.get("expires_in", 3600))
                self.token_expiry = time.time() + expires_in
                self.save_session()
                return True
            else:
                return False
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return False

    def login_with_email(self, email, password):
        """Signs in via Firebase Auth with email and password."""
        payload = {
            "email": email.strip(),
            "password": password,
            "returnSecureToken": True
        }
        headers = {
            "Content-Type": "application/json",
            "X-Android-Package": ANDROID_PACKAGE,
            "X-Android-Cert": ANDROID_CERT_SHA1,
            "X-Client-Version": "Android/FirebaseSDK/20.0.0"
        }
        res = self.session.post(FIREBASE_AUTH_SIGNIN_URL, json=payload, headers=headers, timeout=20)
        data = res.json()
        if res.status_code == 200:
            self.id_token = data["idToken"]
            self.refresh_token = data["refreshToken"]
            self.user_id = data["localId"]
            self.email = data.get("email", email)
            expires_in = int(data.get("expiresIn", 3600))
            self.token_expiry = time.time() + expires_in
            
            # Fetch user profile details safely
            try:
                self.fetch_self_profile()
            except Exception as pe:
                print(f"Could not fetch profile during login: {pe}")
            self.save_session()
            return True, "Đăng nhập thành công!"
        else:
            err_code = data.get("error", {}).get("message", "Đăng nhập thất bại")
            err_map = {
                "EMAIL_NOT_FOUND": "Email này chưa đăng ký tài khoản Locket!",
                "INVALID_PASSWORD": "Mật khẩu không chính xác!",
                "INVALID_LOGIN_CREDENTIALS": "Email hoặc mật khẩu không chính xác!",
                "USER_DISABLED": "Tài khoản Locket này đã bị vô hiệu hóa!",
                "TOO_MANY_ATTEMPTS_TRY_LATER": "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút!"
            }
            err = err_map.get(err_code, f"Lỗi đăng nhập: {err_code}")
            return False, err

    def login_with_token(self, token, user_id=None):
        """Sets custom ID token manually (e.g. captured from proxy / phone SMS login)."""
        self.id_token = token.strip()
        if user_id:
            self.user_id = user_id.strip()
        else:
            # Try to decode JWT payload to find user_id (sub)
            try:
                parts = self.id_token.split(".")
                if len(parts) >= 2:
                    import base64
                    padding = "=" * (4 - len(parts[1]) % 4)
                    payload_json = base64.urlsafe_b64decode(parts[1] + padding).decode("utf-8")
                    decoded = json.loads(payload_json)
                    self.user_id = decoded.get("user_id") or decoded.get("sub")
                    self.email = decoded.get("email", "")
                    self.token_expiry = decoded.get("exp", time.time() + 3600)
            except Exception as e:
                print("Could not decode JWT payload:", e)
        
        self.fetch_self_profile()
        self.save_session()
        return True, "Token đã được thiết lập!"

    def get_auth_headers(self):
        self.ensure_valid_token()
        return {
            "Authorization": f"Bearer {self.id_token}",
            "Content-Type": "application/json",
            "User-Agent": "Locket/1.244.0 (Android; rv:96)"
        }

    def fetch_self_profile(self):
        """Fetches current user profile from Firestore or getUserByUid."""
        if not self.user_id:
            return None
        profile = self.get_user_by_uid(self.user_id)
        if profile:
            self.user_profile = profile
            self.save_session()
            return profile
        
        # Fallback to firestore document
        try:
            url = f"{FIRESTORE_BASE_URL}/users/{self.user_id}"
            headers = {"Authorization": f"Bearer {self.id_token}"}
            res = self.session.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                doc = res.json()
                fields = doc.get("fields", {})
                self.user_profile = {
                    "uid": self.user_id,
                    "first_name": fields.get("first_name", {}).get("stringValue", ""),
                    "last_name": fields.get("last_name", {}).get("stringValue", ""),
                    "username": fields.get("username", {}).get("stringValue", ""),
                    "profile_picture": fields.get("profile_picture", {}).get("stringValue", ""),
                    "badge": fields.get("badge", {}).get("stringValue", "")
                }
                self.save_session()
                return self.user_profile
        except Exception as e:
            print("Error fetching profile from Firestore:", e)
        return None

    def get_user_by_uid(self, uid):
        """Calls fetchUserV2 endpoint to get user info by uid."""
        if not hasattr(self, "_users_cache"):
            self._users_cache = {}
        if uid in self._users_cache:
            return self._users_cache[uid]

        url = f"{API_BASE_URL}/fetchUserV2"
        headers = self.get_auth_headers()
        payload = {"data": {"user_uid": uid}}
        try:
            res = self.session.post(url, json=payload, headers=headers, timeout=12)
            if res.status_code == 200:
                res_data = res.json()
                user_info = res_data.get("result", {}).get("data")
                if user_info:
                    self._users_cache[uid] = user_info
                    return user_info
        except Exception as e:
            print(f"Error getting user by uid {uid}: {e}")
        return None

    def get_user_by_username(self, username):
        """Calls getUserByUsername endpoint."""
        url = f"{API_BASE_URL}/getUserByUsername"
        headers = self.get_auth_headers()
        payload = {"data": {"username": username.strip()}}
        try:
            res = self.session.post(url, json=payload, headers=headers, timeout=15)
            if res.status_code == 200:
                res_data = res.json()
                return True, res_data.get("result") or res_data.get("data")
            else:
                return False, f"HTTP Error {res.status_code}: {res.text}"
        except Exception as e:
            return False, f"Exception: {e}"

    def get_friend_uids(self):
        """Fetches the official list of friend UIDs from Firestore."""
        if not self.user_id:
            return set()
        url = f"{FIRESTORE_BASE_URL}/users/{self.user_id}/friends?pageSize=100"
        headers = self.get_auth_headers()
        headers["X-Android-Package"] = ANDROID_PACKAGE
        headers["X-Android-Cert"] = ANDROID_CERT_SHA1
        try:
            res = self.session.get(url, headers=headers, timeout=12)
            if res.status_code == 200:
                docs = res.json().get("documents", [])
                friends = set()
                for doc in docs:
                    name = doc.get("name", "")
                    uid = name.split("/")[-1]
                    if uid:
                        friends.add(uid)
                return friends
        except Exception as e:
            print(f"Error fetching friend UIDs: {e}")
        return set()

    def get_latest_moments(self, max_friends=40):
        """
        Calls getLatestMomentV2 iteratively using excluded_users to fetch moments
        ONLY from official friends in users/{uid}/friends.
        """
        url = f"{API_BASE_URL}/getLatestMomentV2"
        headers = self.get_auth_headers()

        official_friends = self.get_friend_uids()
        allowed_uids = set(official_friends)
        if self.user_id:
            allowed_uids.add(self.user_id)

        all_moments = []
        excluded_users = []
        users = {}

        max_iter = len(official_friends) + 6 if official_friends else max_friends

        for _ in range(max_iter):
            payload = {"data": {"excluded_users": excluded_users}}
            try:
                res = self.session.post(url, json=payload, headers=headers, timeout=15)
                if res.status_code != 200:
                    break
                res_data = res.json()
                result = res_data.get("result", {})
                items = result.get("data", [])
                if not items:
                    break

                for item in items:
                    u = item.get("user") or item.get("user_uid")
                    if u:
                        if u not in excluded_users:
                            excluded_users.append(u)
                        
                        # Chỉ lấy ảnh của bạn bè chính thức (lọc bỏ người lạ / tài khoản đề xuất)
                        if allowed_uids and u not in allowed_uids:
                            continue

                        # Resolve user profile
                        if u not in users:
                            u_profile = self.get_user_by_uid(u)
                            if u_profile:
                                users[u] = u_profile
                            else:
                                users[u] = {
                                    "first_name": "Bạn bè",
                                    "last_name": "",
                                    "username": ""
                                }
                        all_moments.append(item)

                targets_to_check = set(allowed_uids) if allowed_uids else set(official_friends)
                if targets_to_check and all(f in excluded_users for f in targets_to_check):
                    break
            except Exception as e:
                print("Error in get_latest_moments iteration:", e)
                break

        return True, {
            "moments": all_moments,
            "users": users,
            "raw": all_moments
        }

    def upload_image_to_storage(self, image_path):
        """
        Prepares and uploads an image to Firebase Storage:
        /users/{user_id}/moments/thumbnails/{random_id}.webp
        """
        if not self.user_id:
            return False, "Chưa đăng nhập!"

        # Compress and convert image to WebP (matching Locket client standard)
        try:
            img = Image.open(image_path)
            img = img.convert("RGB")
            
            # Max width/height bounds
            max_size = 1440
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                
            buffer = io.BytesIO()
            img.save(buffer, format="WEBP", quality=85)
            webp_data = buffer.getvalue()
        except Exception as e:
            return False, f"Lỗi xử lý ảnh: {e}"

        # Generate unique storage filename
        random_name = "".join([uuid.uuid4().hex[:10] for _ in range(2)]) + ".webp"
        storage_path = f"users/{self.user_id}/moments/thumbnails/{random_name}"
        encoded_path = requests.utils.quote(storage_path, safe="")

        upload_url = f"https://firebasestorage.googleapis.com/v0/b/{STORAGE_BUCKET}/o?uploadType=media&name={encoded_path}"
        
        headers = {
            "Authorization": f"Firebase {self.id_token}",
            "Content-Type": "image/webp",
            "Content-Length": str(len(webp_data))
        }

        try:
            res = self.session.post(upload_url, data=webp_data, headers=headers, timeout=30)
            if res.status_code == 200:
                data = res.json()
                # Get download token to construct public media URL
                download_tokens = data.get("downloadTokens", "")
                name = data.get("name", storage_path)
                media_url = f"https://firebasestorage.googleapis.com/v0/b/{STORAGE_BUCKET}/o/{requests.utils.quote(name, safe='')}?alt=media&token={download_tokens}"
                return True, media_url
            else:
                # If Firebase auth header fails, try Bearer
                headers["Authorization"] = f"Bearer {self.id_token}"
                res = self.session.post(upload_url, data=webp_data, headers=headers, timeout=30)
                if res.status_code == 200:
                    data = res.json()
                    download_tokens = data.get("downloadTokens", "")
                    name = data.get("name", storage_path)
                    media_url = f"https://firebasestorage.googleapis.com/v0/b/{STORAGE_BUCKET}/o/{requests.utils.quote(name, safe='')}?alt=media&token={download_tokens}"
                    return True, media_url
                return False, f"Lỗi Firebase Storage ({res.status_code}): {res.text}"
        except Exception as e:
            return False, f"Lỗi tải ảnh lên Storage: {e}"

    def post_moment(self, image_path, caption="", sent_to_all=True, recipients=None):
        """
        Complete flow to post a new moment:
        1. Uploads image to Firebase Storage
        2. Calls postMomentV2 endpoint
        """
        if recipients is None:
            recipients = []

        # Step 1: Upload
        ok, res = self.upload_image_to_storage(image_path)
        if not ok:
            return False, res

        thumbnail_url = res

        # Step 2: Post moment to API
        url = f"{API_BASE_URL}/postMomentV2"
        headers = self.get_auth_headers()
        
        payload = {
            "data": {
                "thumbnail_url": thumbnail_url,
                "caption": caption,
                "sent_to_all": sent_to_all,
                "recipients": recipients,
                "overlays": [
                    {
                        "data": {
                            "text": caption,
                            "text_color": "#FFFFFFE6",
                            "type": "standard",
                            "max_lines": {
                                "@type": "type.googleapis.com/google.protobuf.Int64Value",
                                "value": "4"
                            },
                            "background": {
                                "material_blur": "ultra_thin",
                                "colors": []
                            }
                        },
                        "alt_text": caption,
                        "overlay_id": "caption:standard",
                        "overlay_type": "caption"
                    }
                ] if caption else []
            }
        }

        try:
            resp = self.session.post(url, json=payload, headers=headers, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                return True, {"message": "Đăng Moment thành công!", "result": data.get("result")}
            else:
                return False, f"Lỗi postMomentV2 ({resp.status_code}): {resp.text}"
        except Exception as e:
            return False, f"Lỗi kết nối khi đăng moment: {e}"

    def delete_moment(self, moment_uid):
        """Calls deleteMomentV2."""
        url = f"{API_BASE_URL}/deleteMomentV2"
        headers = self.get_auth_headers()
        payload = {"data": {"moment_uid": moment_uid}}
        try:
            res = self.session.post(url, json=payload, headers=headers, timeout=20)
            if res.status_code == 200:
                return True, "Đã xóa khoảnh khắc thành công!"
            else:
                return False, f"Lỗi khi xóa: {res.text}"
        except Exception as e:
            return False, f"Lỗi kết nối: {e}"

    def change_profile_info(self, first_name=None, last_name=None, badge=None):
        """Updates user profile information."""
        url = f"{API_BASE_URL}/changeProfileInfo"
        headers = self.get_auth_headers()
        data = {}
        if first_name is not None:
            data["first_name"] = first_name
        if last_name is not None:
            data["last_name"] = last_name
        if badge is not None:
            data["badge"] = badge
        payload = {"data": data}
        try:
            res = self.session.post(url, json=payload, headers=headers, timeout=20)
            if res.status_code == 200:
                self.fetch_self_profile()
                return True, "Cập nhật thông tin thành công!"
            else:
                return False, f"Lỗi cập nhật ({res.status_code}): {res.text}"
        except Exception as e:
            return False, f"Lỗi kết nối: {e}"
