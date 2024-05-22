from http.server import HTTPServer, SimpleHTTPRequestHandler


httpd = HTTPServer(("localhost", 4443), SimpleHTTPRequestHandler)

httpd.serve_forever()
