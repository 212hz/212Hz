"""212Hz 초대장 로컬 실시간 미리보기 서버.

사용법 (프로젝트 폴더에서):
    python tools/preview.py          -> http://localhost:8212 를 브라우저로 열기
    python tools/preview.py 9000     -> 포트 변경

- 캐시 없이 파일을 제공하므로 저장한 내용이 바로 보입니다.
- index.html / css / js / assets 파일이 저장되면 열린 브라우저가 자동으로 새로고침됩니다
  (js/main.js 가 /__stamp 를 0.8초마다 확인).
- 같은 Wi-Fi 의 휴대폰에서도 http://<이 PC의 IP>:8212 로 볼 수 있습니다.
"""
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WATCH = ("index.html", "css", "js", "assets")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8212


def latest_mtime():
    newest = 0.0
    for name in WATCH:
        path = os.path.join(ROOT, name)
        if os.path.isfile(path):
            newest = max(newest, os.path.getmtime(path))
            continue
        for base, _dirs, files in os.walk(path):
            for f in files:
                newest = max(newest, os.path.getmtime(os.path.join(base, f)))
    return newest


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/__stamp"):
            body = str(latest_mtime()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        if "/__stamp" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print(f"212Hz 미리보기: http://localhost:{PORT}  (종료: Ctrl+C)")
        httpd.serve_forever()
