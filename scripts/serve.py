import functools
from http.server import HTTPServer, SimpleHTTPRequestHandler

request_handler = functools.partial(SimpleHTTPRequestHandler, directory="build")
httpd = HTTPServer(("localhost", 4443), request_handler)
httpd.serve_forever()
