# Lista os ids de foto (foto:xxxx) dos itens de uma loja, para baixar do D1 central-fotos.
import json,sys
loja=sys.argv[1]; s=set()
for x in json.load(open('qa.json',encoding='utf-8'))[0]['results']:
  d=json.loads(x['dados'])
  if x['apagado'] or d.get('loja')!=loja or d.get('feito'): continue
  for f in d.get('fotos') or []:
    if isinstance(f,str) and f.startswith('foto:'): s.add(f[5:])
print(' '.join(sorted(s)))
