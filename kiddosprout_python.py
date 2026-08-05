import json
import os
import secrets
import smtplib
import time
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import unquote


BASE_DIR = Path(__file__).resolve().parent
RECOVERY_CODES = {}
RECOVERY_TTL_SECONDS = 10 * 60
BANK_ITEMS = {}
MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-cache")
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

    with smtplib.SMTP(settings["host"], settings["port"], timeout=12) as smtp:
        smtp.starttls()
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
    is_configured = (
        url.startswith("https://")
        and url.endswith(".supabase.co")
        and "your_supabase" not in url
        and bool(publishable_key)
        and "your_supabase" not in publishable_key
    )
    config = {
        "url": url if is_configured else "",
        "publishableKey": publishable_key if is_configured else "",
        "configured": is_configured,
    }
    body = "window.KIDDO_SPROUT_SUPABASE = " + json.dumps(config) + ";\n"
    return body.encode("utf-8"), "text/javascript; charset=utf-8"


def safe_path(url_path):
    clean = unquote(url_path.split("?", 1)[0].split("#", 1)[0]).lstrip("/")
    if not clean:
        clean = "index.html"

    requested = (BASE_DIR / clean).resolve()
    if BASE_DIR not in requested.parents and requested != BASE_DIR:
        return None
    if requested.is_dir():
        requested = requested / "index.html"
    return requested


def read_static_file(url_path):
    clean = unquote(url_path.split("?", 1)[0].split("#", 1)[0]).lstrip("/")
    if clean == "supabase-config.js":
        return supabase_config()

    path = safe_path(url_path)
    if path is None or not path.exists() or not path.is_file():
        path = BASE_DIR / "index.html"

    body = path.read_bytes()
    content_type = MIME_TYPES.get(path.suffix.lower(), "application/octet-stream")
    return body, content_type


def application(environ, start_response):
    body, content_type = read_static_file(environ.get("PATH_INFO", "/"))
    headers = [
        ("Content-Type", content_type),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-cache"),
    ]
    start_response("200 OK", headers)
    return [body]


class KiddoSproutHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        handle_api_post(self)

    def do_GET(self):
        body, content_type = read_static_file(self.path)
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        body, content_type = read_static_file(self.path)
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8001"))
    server = ThreadingHTTPServer(("0.0.0.0", port), KiddoSproutHandler)
    print(f"KiddoSprout Python app running at http://0.0.0.0:{port}")
    server.serve_forever()
