from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


BASE_DIR = Path(__file__).resolve().parent
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


class SafeSproutHandler(SimpleHTTPRequestHandler):
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
    server = ThreadingHTTPServer(("0.0.0.0", 8001), SafeSproutHandler)
    print("Safe Sprout Python app running at http://0.0.0.0:8001")
    server.serve_forever()
