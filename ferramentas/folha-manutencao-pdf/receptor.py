# Receptor local (porta 8799). Roda DENTRO de uma pasta de trabalho (scratchpad).
# GET  -> entrega itens.json (itens frescos do D1, fotos ja em data:)
# PUT /nome -> grava nome.html (a folha gerada no navegador)
import os
from http.server import BaseHTTPRequestHandler,HTTPServer
P=os.getcwd()
class H(BaseHTTPRequestHandler):
  def _c(s): s.send_header('Access-Control-Allow-Origin','*')
  def do_OPTIONS(s):
    s.send_response(200);s._c();s.send_header('Access-Control-Allow-Methods','PUT,GET');s.send_header('Access-Control-Allow-Headers','*');s.end_headers()
  def do_GET(s):
    b=open(os.path.join(P,'itens.json'),'rb').read()
    s.send_response(200);s._c();s.send_header('Content-Type','application/json');s.end_headers();s.wfile.write(b)
  def do_PUT(s):
    b=s.rfile.read(int(s.headers['Content-Length']));open(os.path.join(P,s.path.strip('/')+'.html'),'wb').write(b)
    s.send_response(200);s._c();s.end_headers();s.wfile.write(b'ok')
HTTPServer(('127.0.0.1',8799),H).serve_forever()
