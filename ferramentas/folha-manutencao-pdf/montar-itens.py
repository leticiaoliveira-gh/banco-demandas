# Uso: python montar-itens.py LOJA   (ex.: CF ou AC) — roda na pasta de trabalho
# Precisa de qa.json (itens mnt28 do D1) e fx/*.json (fotos do D1). Gera itens.json.
import json,glob,base64,hashlib,sys
loja=sys.argv[1]
fm={}
for f in glob.glob('fx/*.json'):
  r=json.load(open(f))[0]['results']
  if not r: continue
  r=r[0]; b=bytes.fromhex(r['h'])
  url=b.decode() if b[:5]==b'data:' else 'data:'+(r['mime'] or 'image/jpeg')+';base64,'+base64.b64encode(b).decode()
  fm['foto:'+r['id']]=url
out=[];n=500000;falt=0
for x in json.load(open('qa.json',encoding='utf-8'))[0]['results']:
  if x['apagado']: continue
  d=json.loads(x['dados'])
  if d.get('loja')!=loja: continue
  fs=[]
  for f in d.get('fotos') or []:
    if isinstance(f,str) and f.startswith('foto:'):
      if f in fm: fs.append(fm[f])
      else: falt+=1
    else: fs.append(f)
  d['fotos']=fs; n+=1; d['id']=n; d['uid']=x['uid']; d['mod']=x['mod']; out.append(d)
json.dump(out,open('itens.json','w',encoding='utf-8'),ensure_ascii=False)
print(len(out),'itens,',sum(1 for d in out if d['fotos']),'com foto; fotos faltando:',falt)
