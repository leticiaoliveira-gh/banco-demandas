# Receita — folha de manutenção em PDF (só o que falta), por pessoa e por piso

Feita em 24/09/2026 (folha do 1º piso de Arraial, Sr. João). Use sempre assim,
para a folha não sair errada de novo.

## Regras que ela já decidiu
- **Uma folha por pessoa.** Nunca misturar Sr. João com Matheus/Dayse/Outro.
- **Matheus: esquecer por enquanto** (pedido de 24/09). Não gerar folha dele.
- Só o que falta fazer (M28F.ver='fazer'), áreas em **ordem alfabética**.
- Fotos precisam aparecer: elas moram no D1 `central-fotos` e têm que virar
  `data:` antes de gerar (a folha ignora `foto:<id>`).
- Dados **frescos do D1**, nunca o DATA velho da página.
- Ralos: ela mandou deixar para depois (não tirar nem mexer nos itens de ralo).

## Passos (pasta de trabalho = scratchpad da sessão)
1. Baixar itens: na pasta `banco-demandas`
   `npx wrangler d1 execute central-demandas --remote --json --command "SELECT uid,dados,mod,apagado FROM itens WHERE tipo='mnt28'" > <scratch>/qa.json`
2. `python ids-fotos.py CF` (na pasta de trabalho, com qa.json) → lista de ids.
3. Para cada id: `npx wrangler d1 execute central-fotos --remote --json --command "SELECT id,mime,hex(imagem) h FROM fotos WHERE id='<id>'" > <scratch>/fx/<id>.json`
4. `python montar-itens.py CF` → itens.json (confere "fotos faltando: 0").
5. Ligar `receptor.py` em segundo plano **dentro da pasta de trabalho** (porta 8799).
6. Subir o site local (localhost:8787) no Claude Browser, colar
   `gerar-no-navegador.js` no javascript_tool (ajustar LISTA e EMITIDO).
7. Imprimir com o Edge (PowerShell; usar Get-Item -LiteralPath, não Resolve-Path):
   `Start-Process -Wait -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList '--headless=new','--disable-gpu','--no-pdf-header-footer','--virtual-time-budget=10000',"--print-to-pdf=`"<scratch>\cf1.pdf`"","`"<url file:///...cf1.html>`""`
8. **Conferência antes de entregar (QA):** contar serviços por área no PDF x D1,
   conferir executor único, fotos presentes, itens sem data, ordem alfabética.
9. Salvar com o nome no padrão:
   `Relatório MNT - 1º PISO CF - Sr João - só o que falta (DD-MM-AA).pdf`
   na pasta `2. Transferência (CloudFlare)\memorias\CODE - Folhas Sr Joao Cabo Frio (DD-MM-AA)\`
   e mandar com SendUserFile.
