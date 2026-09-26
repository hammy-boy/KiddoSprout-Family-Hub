import json
import os
import re
import secrets
import smtplib
import ssl
import time
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent
RECOVERY_CODES = {}
RECOVERY_TTL_SECONDS = 10 * 60
BANK_ITEMS = {}
MIME_TYPES = {
    ".avif": "image/avif",
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".game": "application/octet-stream",
    ".webmanifest": "application/manifest+json",
}

# This legacy helper is a loopback-only static preview. Keep an explicit
# allow-list so a request can never read .env, source code, database files,
# build scripts, or blocker packages from the project directory.
PUBLIC_FILES = frozenset({
    "404.html", "index.html", "offline.html", "recipe.html", "app_7.html", "blocker-setup.html",
    "creator-studio.html", "learning-path.html", "move-breaks.html", "nature-explorer.html",
    "report_problem.html", "sprout-tutor.html", "story-theater.html", "story-voices.html",
    "style.css", "kid-hubs.css", "learning-path.css", "sprout-tutor.css", "blocker-setup.css", "story-voices.css",
    "js.js", "auth-session.js", "blocker-setup.js", "demo-mode.js",
    "human-check.js", "language-settings.js", "kid-hub-gate.js",
    "learning-curriculum.js", "learning-path.js", "sprout-tutor-config.js", "sprout-tutor.js",
    "local-docker-redirect.js", "passcode-security.js", "recipe-cloud.js",
    "recipe-catalog-v5342473ad68b.js",
    "story-ethan-leo-data.js", "story-library-data.js",
    "story-voice-choice.js", "story-storage.js", "story-voices.js",
    "manifest.webmanifest", "family-tech-hub-v01232923b55c.avif",
    "family-tech-hub-v0fb9d85f0464.webp", "family-tech-hub-v5fffdb82973c.jpg",
    "kiddosprout_logo.png",
    "kiddosprout_logo_128.png", "kiddosprout_logo_192.png",
    "kiddosprout_blocked_1280x800.png", "service-worker.js",
    "Game 1.game",
    "games/index.html", "games/arcade-access.js", "games/arcade-shell.css",
    "games/brick-breaker/index.html", "games/brick-breaker/style.css",
    "games/brick-breaker/engine.js", "games/brick-breaker/game.js",
    "games/memory-game/index.html", "games/memory-game/style.css",
    "games/memory-game/engine.js", "games/memory-game/game.js",
    "games/meteor-game/index.html", "games/meteor-game/style.css",
    "games/meteor-game/engine.js", "games/meteor-game/game.js",
    "games/multiplication-runner/index.html", "games/multiplication-runner/style.css",
    "games/multiplication-runner/engine.js", "games/multiplication-runner/game.js",
    "games/platformer-game/index.html", "games/platformer-game/style.css",
    "games/platformer-game/engine.js", "games/platformer-game/game.js",
    "games/racing-game/index.html", "games/racing-game/style.css", "games/racing-game/game.js",
    "games/snake-game/index.html", "games/snake-game/style.css",
    "games/snake-game/engine.js", "games/snake-game/game.js",
})
PUBLIC_STORY_ASSET = re.compile(
    r"^assets/story-[a-z0-9-]+\.(?:avif|gif|jpe?g|png|webp)$",
    re.IGNORECASE,
)
STATIC_CONTENT_SECURITY_POLICY = (
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
    "form-action 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com "
    "https://cdn.plaid.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' "
    "https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* "
    "http://localhost:* ws://localhost:* https://www.themealdb.com https://en.wikipedia.org "
    "https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com; "
    "frame-src https://challenges.cloudflare.com https://cdn.plaid.com; worker-src 'self'; "
    "manifest-src 'self'; font-src 'self'"
)
API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
STATIC_SECURITY_HEADERS = (
    ("X-Content-Type-Options", "nosniff"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("X-Frame-Options", "DENY"),
    ("Cross-Origin-Opener-Policy", "same-origin-allow-popups"),
    ("Cross-Origin-Resource-Policy", "same-origin"),
    ("Permissions-Policy", "camera=(self), display-capture=(self), geolocation=(), microphone=(self)"),
    ("Content-Security-Policy", STATIC_CONTENT_SECURITY_POLICY),
)
API_SECURITY_HEADERS = tuple(
    (name, API_CONTENT_SECURITY_POLICY if name == "Content-Security-Policy" else value)
    for name, value in STATIC_SECURITY_HEADERS
)


def load_local_env():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        clean = line.strip()
        if not clean or clean.startswith("#") or "=" not in clean:
            continue
        key, value = clean.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env()


def json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    for name, value in API_SECURITY_HEADERS:
        handler.send_header(name, value)
    handler.end_headers()
    handler.wfile.write(body)


def read_json_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length > 20_000:
        raise ValueError("Request is too large.")
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw or "{}")


def smtp_settings():
    return {
        "host": os.environ.get("SMTP_HOST", ""),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASS", ""),
        "sender": os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", "")),
    }


def send_recovery_email(email, code):
    settings = smtp_settings()
    missing = [key for key in ("host", "user", "password", "sender") if not settings[key]]
    if missing:
        raise RuntimeError("Email is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.")

    message = EmailMessage()
    message["Subject"] = "KiddoSprout one-time code"
    message["From"] = settings["sender"]
    message["To"] = email
    message.set_content(
        "Your KiddoSprout one-time code is:\n\n"
        f"{code}\n\n"
        "This code expires in 10 minutes. If you did not request it, ignore this email."
    )

    tls_context = ssl.create_default_context()
    if settings["port"] in {465, 2465}:
        smtp_connection = smtplib.SMTP_SSL(
            settings["host"], settings["port"], timeout=12, context=tls_context
        )
    else:
        smtp_connection = smtplib.SMTP(settings["host"], settings["port"], timeout=12)

    with smtp_connection as smtp:
        if settings["port"] not in {465, 2465}:
            smtp.starttls(context=tls_context)
        smtp.login(settings["user"], settings["password"])
        smtp.send_message(message)


def plaid_base_url():
    env = os.environ.get("PLAID_ENV", "sandbox").strip().lower()
    if env == "production":
        return "https://production.plaid.com"
    if env == "development":
        return "https://development.plaid.com"
    return "https://sandbox.plaid.com"


def plaid_settings():
    return {
        "client_id": os.environ.get("PLAID_CLIENT_ID", "").strip(),
        "secret": os.environ.get("PLAID_SECRET", "").strip(),
        "base_url": plaid_base_url(),
    }


def plaid_enabled():
    settings = plaid_settings()
    return bool(settings["client_id"] and settings["secret"])


def plaid_request(path, payload):
    settings = plaid_settings()
    if not plaid_enabled():
        raise RuntimeError("Bank linking is not configured. Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV on the server.")
    body = dict(payload)
    body["client_id"] = settings["client_id"]
    body["secret"] = settings["secret"]
    data = json.dumps(body).encode("utf-8")
    request = Request(
        settings["base_url"] + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=16) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except HTTPError as error:
        try:
            details = json.loads(error.read().decode("utf-8") or "{}")
        except json.JSONDecodeError:
            details = {"error_message": "Bank provider request failed."}
        raise RuntimeError(
            details.get("error_message")
            or details.get("display_message")
            or "Bank provider request failed."
        ) from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError("Could not reach the bank-link provider. Try again later.") from error


def handle_bank_post(handler, path, data):
    parent_id = str(data.get("parentId", "kiddo-sprout-parent")).strip()[:80] or "kiddo-sprout-parent"
    if path == "/api/bank/status":
        json_response(handler, 200, {
            "ok": True,
            "configured": plaid_enabled(),
            "provider": "Plaid",
            "hasConnection": parent_id in BANK_ITEMS,
        })
        return

    if path == "/api/bank/link-token":
        try:
            result = plaid_request("/link/token/create", {
                "user": {"client_user_id": parent_id},
                "client_name": "KiddoSprout Smart Spending",
                "products": ["transactions"],
                "country_codes": ["US", "GB", "CA", "IE", "FR", "ES", "NL"],
                "language": "en",
            })
        except RuntimeError as error:
            json_response(handler, 503, {"ok": False, "error": str(error)})
            return
        json_response(handler, 200, {"ok": True, "link_token": result.get("link_token")})
        return

    if path == "/api/bank/exchange-public-token":
        public_token = str(data.get("publicToken", "")).strip()
        if not public_token:
            json_response(handler, 400, {"ok": False, "error": "Missing public token."})
            return
        try:
            result = plaid_request("/item/public_token/exchange", {"public_token": public_token})
        except RuntimeError as error:
            json_response(handler, 502, {"ok": False, "error": str(error)})
            return
        BANK_ITEMS[parent_id] = {
            "access_token": result.get("access_token", ""),
            "item_id": result.get("item_id", ""),
            "connected_at": time.time(),
        }
        json_response(handler, 200, {"ok": True, "message": "Bank connected."})
        return

    if path == "/api/bank/accounts":
        item = BANK_ITEMS.get(parent_id)
        if not item:
            json_response(handler, 404, {"ok": False, "error": "No bank is connected yet."})
            return
        try:
            result = plaid_request("/accounts/balance/get", {"access_token": item["access_token"]})
        except RuntimeError as error:
            json_response(handler, 502, {"ok": False, "error": str(error)})
            return
        accounts = []
        for account in result.get("accounts", []):
            balances = account.get("balances", {})
            accounts.append({
                "name": account.get("name", "Bank account"),
                "mask": account.get("mask", ""),
                "type": account.get("type", "account"),
                "available": balances.get("available"),
                "current": balances.get("current"),
                "currency": balances.get("iso_currency_code") or "USD",
            })
        json_response(handler, 200, {"ok": True, "accounts": accounts})
        return

    json_response(handler, 404, {"ok": False, "error": "Bank API route not found."})


def handle_api_post(handler):
    try:
        data = read_json_body(handler)
    except (json.JSONDecodeError, ValueError) as error:
        json_response(handler, 400, {"ok": False, "error": str(error)})
        return

    path = unquote(handler.path.split("?", 1)[0])
    if path.startswith("/api/bank/"):
        handle_bank_post(handler, path, data)
        return

    if path == "/api/recovery/send":
        email = str(data.get("email", "")).strip().lower()
        if "@" not in email or "." not in email:
            json_response(handler, 400, {"ok": False, "error": "Enter a valid email."})
            return
        code = f"{secrets.randbelow(900000) + 100000}"
        try:
            send_recovery_email(email, code)
        except RuntimeError as error:
            json_response(handler, 503, {"ok": False, "error": str(error)})
            return
        except (OSError, smtplib.SMTPException):
            json_response(handler, 502, {"ok": False, "error": "Email could not be sent. Check your SMTP settings."})
            return
        RECOVERY_CODES[email] = {"code": code, "expires": time.time() + RECOVERY_TTL_SECONDS}
        json_response(handler, 200, {"ok": True, "message": "One-time code sent."})
        return

    if path == "/api/recovery/verify":
        email = str(data.get("email", "")).strip().lower()
        code = str(data.get("code", "")).strip()
        saved = RECOVERY_CODES.get(email)
        if not saved or saved["expires"] < time.time():
            RECOVERY_CODES.pop(email, None)
            json_response(handler, 400, {"ok": False, "error": "Code expired. Send a new code."})
            return
        if not secrets.compare_digest(saved["code"], code):
            json_response(handler, 400, {"ok": False, "error": "Incorrect one-time code."})
            return
        RECOVERY_CODES.pop(email, None)
        json_response(handler, 200, {"ok": True, "message": "Code verified."})
        return

    json_response(handler, 404, {"ok": False, "error": "API route not found."})


def supabase_config():
    url = os.environ.get("SUPABASE_URL", "").strip().removesuffix("/rest/v1/").rstrip("/")
    publishable_key = (
        os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")
        or os.environ.get("SUPABASE_ANON_KEY", "")
    ).strip()
    turnstile_site_key = os.environ.get("TURNSTILE_SITE_KEY", "").strip()
    parsed_url = urlparse(url)
    is_managed_url = parsed_url.scheme == "https" and parsed_url.hostname and parsed_url.hostname.endswith(".supabase.co")
    is_local_url = parsed_url.scheme == "http" and parsed_url.hostname in {"localhost", "127.0.0.1"}
    is_configured = (
        (is_managed_url or is_local_url)
        and "your_supabase" not in url
        and bool(publishable_key)
        and "your_supabase" not in publishable_key
    )
    config = {
        "url": url if is_configured else "",
        "publishableKey": publishable_key if is_configured else "",
        "turnstileSiteKey": turnstile_site_key,
        "configured": is_configured,
    }
    body = "window.KIDDO_SPROUT_SUPABASE = " + json.dumps(config) + ";\n"
    return body.encode("utf-8"), "text/javascript; charset=utf-8"


def safe_path(url_path):
    clean = unquote(url_path.split("?", 1)[0].split("#", 1)[0]).lstrip("/")
    if not clean:
        clean = "index.html"
    elif clean.endswith("/"):
        clean += "index.html"

    if clean not in PUBLIC_FILES and not PUBLIC_STORY_ASSET.fullmatch(clean):
        return None

    requested = (BASE_DIR / clean).resolve()
    if BASE_DIR not in requested.parents and requested != BASE_DIR:
        return None
    if requested.is_symlink() or not requested.is_file():
        return None
    return requested


def read_static_file(url_path):
    clean = unquote(url_path.split("?", 1)[0].split("#", 1)[0]).lstrip("/")
    if clean == "supabase-config.js":
        body, content_type = supabase_config()
        return body, content_type, 200

    path = safe_path(url_path)
    if path is None:
        not_found_path = BASE_DIR / "404.html"
        if not_found_path.is_file() and not not_found_path.is_symlink():
            return not_found_path.read_bytes(), "text/html; charset=utf-8", 404
        return b"Not found.\n", "text/plain; charset=utf-8", 404

    body = path.read_bytes()
    content_type = MIME_TYPES.get(path.suffix.lower(), "application/octet-stream")
    return body, content_type, 200


def static_cache_control(url_path, status):
    clean_path = url_path.split("?", 1)[0]
    if status != 200 or clean_path in {"/supabase-config.js", "/service-worker.js"}:
        return "no-store"
    if re.fullmatch(
        r"/(?:recipe-catalog-v[0-9a-f]{12}\.js|family-tech-hub-v[0-9a-f]{12}\.(?:avif|jpe?g|webp)|assets/story-[a-z0-9-]+-v[0-9a-f]{12}\.webp)",
        clean_path,
        re.IGNORECASE,
    ):
        return "public, max-age=31536000, immutable"
    return "no-cache"


def application(environ, start_response):
    request_path = environ.get("PATH_INFO", "/")
    query_string = environ.get("QUERY_STRING", "")
    cache_path = f"{request_path}?{query_string}" if query_string else request_path
    if environ.get("REQUEST_METHOD", "GET").upper() not in {"GET", "HEAD"}:
        body, content_type, status = b"Use the Docker services for KiddoSprout APIs.\n", "text/plain; charset=utf-8", 405
    else:
        body, content_type, status = read_static_file(request_path)
    headers = [
        ("Content-Type", content_type),
        ("Content-Length", str(len(body))),
        ("Cache-Control", static_cache_control(cache_path, status)),
        *(API_SECURITY_HEADERS if request_path.startswith("/api/") else STATIC_SECURITY_HEADERS),
    ]
    start_response(f"{status} {'OK' if status == 200 else 'Not Found' if status == 404 else 'Method Not Allowed'}", headers)
    return [] if environ.get("REQUEST_METHOD", "GET").upper() == "HEAD" else [body]


class KiddoSproutHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        json_response(self, 405, {
            "ok": False,
            "error": "This legacy preview does not run account, email, bank, voice, or blocker APIs. Start KiddoSprout with npm run dev.",
        })

    def do_GET(self):
        body, content_type, status = read_static_file(self.path)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", static_cache_control(self.path, status))
        security_headers = API_SECURITY_HEADERS if self.path.split("?", 1)[0].startswith("/api/") else STATIC_SECURITY_HEADERS
        for name, value in security_headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        body, content_type, status = read_static_file(self.path)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", static_cache_control(self.path, status))
        security_headers = API_SECURITY_HEADERS if self.path.split("?", 1)[0].startswith("/api/") else STATIC_SECURITY_HEADERS
        for name, value in security_headers:
            self.send_header(name, value)
        self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8001"))
    server = ThreadingHTTPServer(("127.0.0.1", port), KiddoSproutHandler)
    print(f"KiddoSprout Python preview running at http://127.0.0.1:{port}")
    server.serve_forever()
