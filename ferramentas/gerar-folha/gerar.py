"""Gera a folha de manutencao em PDF, do jeito que o site gera.

POR QUE ASSIM E NAO EM PYTHON DIRETO
  A folha do site pagina medindo altura de bloco DENTRO do navegador. Refazer
  isso em Python daria uma folha parecida, nunca a mesma -- e ela entrega esse
  papel assinado com o CRN. Entao aqui o Python so separa os dados; quem monta
  a folha e o proprio js/mnt28.js, e o Chrome imprime.

USO
  python ferramentas/gerar-folha/gerar.py --loja XX --piso "1o PISO" --exec "NOME"
  python ferramentas/gerar-folha/gerar.py --loja XX --piso "1o PISO" --exec "NOME" \\
         --corte 2026-07-29 --nome "Relatorio MNT - 1o PISO - julho"

  --corte AAAA-MM-DD  a folha so leva o que ja existia nessa data. E a via de
                      PROVA: ela imprime, marca a mao o que ja foi resolvido e
                      leva a empresa. Sem o corte, a folha mostraria coisas que
                      nem existiam no dia -- o contrario de uma prova.
  --embranco          todos os quadradinhos vazios, para ela marcar a mao.
  --saida PASTA       onde gravar (por padrao, a pasta das folhas na nuvem)

PRECISA de um servidor servindo a pasta do site em http://localhost:8787
(o mesmo do preview). O gerar.py nao sobe servidor: se nao houver, ele avisa.
"""

import argparse
import datetime
import json
import pathlib
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parents[2]          # a pasta do site
BANCO = RAIZ.parent / "banco-demandas-dados" / "banco.json"
NUVEM = (pathlib.Path.home() / "Desktop" / "OneDrive" / "- Nutricionista")
PORTA = 8787

CHROMES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def achar_navegador():
    for c in CHROMES:
        if pathlib.Path(c).exists():
            return c
    achado = shutil.which("chrome") or shutil.which("msedge")
    if achado:
        return achado
    raise SystemExit("Nao achei o Chrome nem o Edge para gerar o PDF.")


def servidor_no_ar():
    try:
        urllib.request.urlopen(f"http://localhost:{PORTA}/index.html", timeout=3)
        return True
    except Exception:
        return False


def separar(loja, piso, executor):
    """So o que vai para esta folha. O resto do banco nem chega ao navegador."""
    d = json.loads(BANCO.read_text(encoding="utf-8"))
    itens = [x for x in d["itens"]
             if not x.get("deleted") and x.get("tipo") == "mnt28" and x.get("loja") == loja]
    nome = ""
    for e in (d.get("empresas") or []):
        if (e.get("code") or e.get("sigla")) == loja:
            nome = e.get("name") or e.get("nome") or ""
    return {
        "loja": loja,
        "nomeLoja": nome,
        "itens": itens,
        # o cabecalho que ela editou pelo lapis mora dentro de folhasCfg,
        # nao solto na raiz do banco -- foi assim que o site guardou desde julho
        "cabecalho": (d.get("folhasCfg") or {}).get("mnt28Cabecalho") or {},
        "textos": (d.get("folhasCfg") or {}).get("mnt28Textos") or {},
        "rtInfo": d.get("rtInfo") or "",
    }


def main():
    p = argparse.ArgumentParser(description="Gera a folha de manutencao em PDF.")
    p.add_argument("--loja", required=True, help="a sigla, como AC ou CF")
    p.add_argument("--piso", default="", help='ex: "1o PISO"')
    p.add_argument("--area", default="")
    p.add_argument("--exec", dest="executor", default="", help="de quem e a folha")
    p.add_argument("--ver", default="todos", choices=["todos", "fazer", "feitos"])
    p.add_argument("--corte", default="", help="AAAA-MM-DD: so o que existia ate esse dia")
    p.add_argument("--emitido", default="", help="AAAA-MM-DD da emissao; e o mes que sai na faixa")
    p.add_argument("--embranco", action="store_true",
                   help="todos os quadradinhos vazios, mesmo o que ja esta feito no site. "
                        "E' assim que sai a via que ELA marca a mao para mostrar a empresa "
                        "o que ja foi resolvido -- se o papel ja vier marcado, nao prova nada.")
    p.add_argument("--nome", default="", help="nome do arquivo, sem .pdf")
    p.add_argument("--saida", default="", help="pasta de destino")
    a = p.parse_args()

    if not servidor_no_ar():
        raise SystemExit(f"Nada respondendo em http://localhost:{PORTA}. "
                         "Abra o site local antes (o preview do Claude Code ja serve).")

    dados = separar(a.loja, a.piso, a.executor)
    if not dados["itens"]:
        raise SystemExit(f"Nenhum servico de manutencao na loja {a.loja}.")

    # Os dois arquivos ficam na RAIZ do site so enquanto o navegador le, e saem
    # no finally: nada de dado real parado numa pasta que vai para o GitHub.
    ponte = RAIZ / "dados-da-folha.js"
    pagina = RAIZ / "_folha-em-montagem.html"
    ponte.write_text("var DADOS_DA_FOLHA = " + json.dumps(dados, ensure_ascii=False) + ";",
                     encoding="utf-8")

    # UMA COPIA DO index.html com dois scripts colados no fim. E' a unica forma
    # que funciona: dentro da propria pagina do site o escopo e' o mesmo, e nao
    # ha nada para sincronizar entre janelas. Ver o comentario em injetar.js.
    indice = (RAIZ / "index.html").read_text(encoding="utf-8")
    extra = ("<script src=" + chr(34) + "/dados-da-folha.js" + chr(34) + "></script>"
             + "<script src=" + chr(34) + "/ferramentas/gerar-folha/injetar.js"
             + chr(34) + "></script>")
    pagina.write_text(indice.replace("</body>", extra + "</body>", 1)
                      if "</body>" in indice else indice + extra, encoding="utf-8")

    try:
        q = {"loja": a.loja, "piso": a.piso, "area": a.area, "exec": a.executor, "ver": a.ver}
        if a.corte:
            q["corte"] = a.corte
        if a.emitido:
            q["emitido"] = a.emitido
        if a.embranco:
            q["embranco"] = "1"
        url = (f"http://localhost:{PORTA}/_folha-em-montagem.html?"
               + urllib.parse.urlencode({k: v for k, v in q.items() if v}))

        hoje = datetime.date.today().strftime("%d-%m-%y")
        nome = a.nome or (f"Relatorio MNT - {a.piso or a.loja}"
                          + (f" - {a.executor}" if a.executor else "")
                          + (f" - ate {a.corte}" if a.corte else "")
                          + f" ({hoje})")
        # sem --saida, cai numa pasta do dia dentro da nuvem. O nome sai da
        # loja e da data, nunca de nome de pessoa: isto aqui e' codigo publico.
        destino = pathlib.Path(a.saida) if a.saida else (NUVEM / f"Folhas {a.loja} ({hoje})")
        destino.mkdir(parents=True, exist_ok=True)
        alvo = destino / (nome.replace("/", "-") + ".pdf")

        print(f"montando: {url}")
        # DUAS PASSADAS, e nao uma. Numa passada so, o Chrome imprimia uma pagina
        # em branco de 10 KB: ele decide a hora de imprimir sozinho, e a folha
        # ainda estava sendo montada. Entao: primeiro --dump-dom, que devolve o
        # HTML JA PRONTO; depois o PDF sai desse HTML, que nao espera mais nada.
        navegador = achar_navegador()
        pronto = subprocess.run(
            [navegador, "--headless=new", "--disable-gpu", "--virtual-time-budget=30000",
             "--dump-dom", url],
            check=True, capture_output=True, timeout=240).stdout.decode("utf-8", "replace")

        if '<div class="folha"' not in pronto:
            raise SystemExit("A folha nao montou. Abra a URL acima no navegador. "
                             + pronto[:500])

        # RECORTA SO A FOLHA.
        # O document.write() do site nao substituiu a pagina como se esperava:
        # o body do index continuou inteiro (barra lateral, botoes, capa) e as
        # folhas foram parar no meio disso. Resultado: 3 folhas viravam 5 paginas
        # de PDF, com o site impresso junto. Em vez de brigar com o write, o
        # recorte e' feito aqui, onde e' simples e nao depende do navegador:
        # fica o <style> da folha e a caixa com as folhas dentro. Nada mais.
        estilo = re.search(r"<style>(?:(?!</style>).)*@page(?:(?!</style>).)*</style>", pronto, re.S)
        alvo_html = re.search(r'<div id="alvo">.*?</div>\s*(?=<script|</body|<div id=)', pronto, re.S)
        if not (estilo and alvo_html):
            # sem os dois pedacos nao da para montar uma folha limpa; melhor
            # parar do que entregar um PDF com o site impresso junto
            raise SystemExit("Nao achei o estilo ou as folhas no que o navegador devolveu.")
        pronto = ("<html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>"
                  + nome + "</title>" + estilo.group(0) + "</head><body>"
                  + alvo_html.group(0) + "</body></html>")

        montada = RAIZ / "_folha-montada.html"
        montada.write_text("<!doctype html>" + pronto, encoding="utf-8")
        try:
            subprocess.run([navegador, "--headless=new", "--disable-gpu",
                            "--no-pdf-header-footer", "--virtual-time-budget=15000",
                            f"--print-to-pdf={alvo}", montada.as_uri()],
                           check=True, capture_output=True, timeout=240)
        finally:
            montada.unlink(missing_ok=True)
    finally:
        ponte.unlink(missing_ok=True)
        pagina.unlink(missing_ok=True)

    if not alvo.exists() or alvo.stat().st_size < 3000:
        raise SystemExit("O PDF saiu vazio. Abra a URL acima no navegador para ver o que faltou.")
    print(f"pronto: {alvo}  ({alvo.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
