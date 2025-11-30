#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple HTTP server for serving the built app from dist folder
"""
import http.server
import socketserver
import os
import sys
import socket

def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

# Change to dist directory
if os.path.exists('dist'):
    os.chdir('dist')
    print(f"Serving from: {os.getcwd()}")
else:
    print("ERROR: dist folder not found. Run 'npm run build' first.")
    sys.exit(1)

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers if needed
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"[{self.log_date_time_string()}] {format % args}")

Handler = MyHTTPRequestHandler

print("=" * 60)
print(" Formansbil Kalkylator - Python Server")
print("=" * 60)
print(f" Server running at: http://localhost:{PORT}/")
print(f" Network: http://{get_ip()}:{PORT}/")
print("=" * 60)
print("Press Ctrl+C to stop the server")
print()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped")
        sys.exit(0)

