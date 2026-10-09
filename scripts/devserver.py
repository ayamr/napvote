"""Serveur local sans cache : python3 scripts/devserver.py  ->  http://localhost:8766"""
import http.server, os, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control","no-store"); super().end_headers()
    def log_message(self,*a): pass
os.chdir(os.path.join(os.path.dirname(__file__),"..","www"))
http.server.ThreadingHTTPServer(("",8766),H).serve_forever()
