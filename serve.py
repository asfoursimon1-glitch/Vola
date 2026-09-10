#!/usr/bin/env python3
"""Static development server for the VOLÀ site.

Development only. It says nothing about how the site should be served in
production — in particular the no-cache header below is here because there is
no build step and no hashed filenames, so a cached vola.css or app.js means
editing a file and seeing nothing change.
"""
import http.server
import os

PORT = int(os.environ.get('PORT', 8000))


class VolaHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def handle_one_request(self):
        # A browser that navigates away mid-response aborts the socket. That is
        # normal, and it should not print a traceback that looks like a bug in
        # the site.
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            self.close_connection = True


# Threading matters here: a page pulls a stylesheet, five scripts and twenty
# SVGs at once, and the single-threaded TCPServer serves them strictly one at
# a time — one aborted request stalls everything behind it.
if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(("", PORT), VolaHandler) as httpd:
        print(f"Serving on port {PORT}...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
