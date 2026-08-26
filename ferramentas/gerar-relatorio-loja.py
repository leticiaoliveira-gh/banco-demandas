"""Gera os dois relatorios de uma loja a partir do banco: a FOLHA DE MANUTENCAO
e o RELATORIO DE NAO CONFORMIDADE, no formato que a Le aprovou em 13/08/2026.

Rodar:
    python ferramentas/gerar-relatorio-loja.py AC
    python ferramentas/gerar-relatorio-loja.py CF --banco "..\\banco-demandas-dados\\banco.json"
    python ferramentas/gerar-relatorio-loja.py AC --saida "C:\\...\\CODE - Relatorios (25-08-26)"

Escreve .md e .html (o .html abre no navegador e vira PDF por Ctrl+P).

O QUE ESTE SCRIPT NAO FAZ, DE PROPOSITO:
  - nao altera o banco;
  - nao decide nada por ela: so agrupa e escreve o que ja esta gravado;
  - nao inventa numero. Sem item no periodo, escreve "em acompanhamento".

REGRAS DA CASA QUE ESTAO CODIFICADAS AQUI (CLAUDE.md, secao 3 e skill phd-em-solucoes):
  - frase comeca no verbo (o banco ja guarda assim; aqui so nao se estraga);
  - nada vira "orcar" -- a ideia tecnica dela vai na observacao;
  - "VERIFICAR" nunca se apaga: mora em `obs` E em `nota`, e os dois sao lidos;
  - travessao longo e proibido no texto que sai para a gerencia;
  - piso escrito de tres jeitos ("1o PISO", "1º Piso") e UM piso so na saida --
    o conserto de verdade e o AR-1, que e decisao dela, e nao se faz aqui.
"""

import argparse
import datetime
import html
import json
import pathlib
import re
import unicodedata
from collections import defaultdict

RT_PADRAO = "Letícia Oliveira — Nutricionista de Produção – RT · CRN-4: 22103217"

LOJAS = {
    "AC": "Arraial do Cabo — Super Fricarnes",
    "CF": "Cabo Frio — Super Fricarnes",
    "SF": "Super Fricarnes",
}

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
         "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

CATEGORIA = {"exigencia": "Exigência", "recomendacao": "Recomendação",
             "dica": "Dica funcional"}


# --------------------------------------------------------------- utilidades

def sem_acento(texto):
    forma = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in forma if unicodedata.category(c) != "Mn").lower()


def piso_bonito(nome):
    """"1o PISO", "1º Piso" e "1º PISO " sao o mesmo piso. Junta na saida."""
    limpo = re.sub(r"\s+", " ", sem_acento(nome)).strip()
    for numero in ("1", "2", "3"):
        if re.fullmatch(rf"{numero}[oº]? ?piso", limpo):
            return f"{numero}º Piso"
    return (nome or "").strip() or "Sem piso definido"


def ordem_piso(nome):
    achou = re.match(r"(\d)", nome)
    return (0, int(achou.group(1))) if achou else (1, 0)


def data_br(iso):
    if not iso:
        return None
    try:
        return datetime.date.fromisoformat(str(iso)[:10])
    except ValueError:
        return None


def ha_quanto_tempo(desde, hoje):
    """"há 1 ano e 6 meses" — do jeito que ela le, nunca em dias soltos."""
    if not desde:
        return None
    meses = (hoje.year - desde.year) * 12 + (hoje.month - desde.month)
    if desde.day > hoje.day:
        meses -= 1
    if meses < 1:
        dias = (hoje - desde).days
        if dias < 1:
            return "hoje"
        return f"há {dias} dia" + ("s" if dias > 1 else "")
    if meses < 12:
        return f"há {meses} " + ("mês" if meses == 1 else "meses")
    anos, resto = divmod(meses, 12)
    parte = f"há {anos} ano" + ("s" if anos > 1 else "")
    if resto:
        parte += f" e {resto} " + ("mês" if resto == 1 else "meses")
    return parte


def limpar(texto):
    """Tira o travessao longo (ela reconhece de longe e diz que 'tem cara de IA')
    e arruma o espaco DENTRO de cada linha.

    A QUEBRA DE LINHA E CONTEUDO, nao espaco a normalizar: quando ela escreve
    em topicos, os topicos tem de chegar em topicos no relatorio. Foi o pedido
    dela em 25/08."""
    t = (texto or "").replace("—", ",").replace("–", ",")
    saida = []
    for linha in t.split("\n"):
        l = re.sub(r"[ \t]+", " ", linha)
        l = re.sub(r"\s+([,.;:])", r"\1", l)
        l = re.sub(r"([,.;:])\s*([,.;:])", r"\1", l)
        l = l.strip().lstrip(",;: ").strip()
        if l:
            saida.append(l)
    return "\n".join(saida)


def verificar_de(item):
    """O VERIFICAR mora em DOIS campos. Procurar em um so da diagnostico errado."""
    for campo in ("obs", "nota"):
        valor = item.get(campo) or ""
        if "VERIFICAR" in valor.upper():
            return limpar(valor)
    return None


# --------------------------------------------------------------- leitura

def carregar(caminho, sigla):
    dados = json.loads(pathlib.Path(caminho).read_text(encoding="utf-8"))
    itens = [x for x in dados.get("itens", [])
             if not x.get("deleted") and x.get("loja") == sigla]
    return itens


def em_aberto_folha(item):
    if item.get("tipo") != "mnt28":
        return False
    feito = item.get("feito")
    if isinstance(feito, str):
        feito = feito.lower() in ("true", "1", "sim")
    return not feito


def em_aberto_nc(item):
    return item.get("tipo") == "nc" and item.get("status") == "Aberta"


def agrupar(itens):
    """piso -> area -> lista, com o piso ja unificado."""
    arvore = defaultdict(lambda: defaultdict(list))
    for x in itens:
        arvore[piso_bonito(x.get("piso"))][(x.get("area") or "SEM ÁREA").strip()].append(x)
    return arvore


def pisos_ordenados(arvore):
    return sorted(arvore, key=lambda p: (p == "Sem piso definido", ordem_piso(p), p))


# --------------------------------------------------------------- escrita

def marcador_fotos(item):
    """A foto e a prova. Ela pediu com todas as letras: 'eu PRECISO das imagens'.
    Vai como marcador no markdown e vira imagem de verdade no HTML."""
    fotos = [f for f in (item.get("fotos") or []) if isinstance(f, str) and f.startswith("data:")]
    return ["[[FOTOS]]" + "|".join(fotos)] if fotos else []


def bloco_item(texto, linhas_extras):
    saida = ["- " + texto + "  "]
    saida += ["  *" + l + "*  " if l.startswith("desde ") or l.startswith("registrada")
              else "  " + l + "  " for l in linhas_extras]
    return "\n".join(saida)


def escrever_folha(itens, sigla, hoje):
    abertos = [x for x in itens if em_aberto_folha(x)]
    por_executor = defaultdict(list)
    for x in abertos:
        por_executor[(x.get("executor") or "Sem responsável definido").strip()].append(x)

    antigos = 0
    for x in abertos:
        d = data_br(x.get("dataRegistro") or x.get("relato"))
        if d and (hoje - d).days >= 365:
            antigos += 1

    linhas = [
        "# FOLHA DE MANUTENÇÃO E INFRAESTRUTURA",
        f"## {LOJAS.get(sigla, sigla)}",
        f"### Situação em {hoje.day} de {MESES[hoje.month-1]} de {hoje.year} · {RT_PADRAO}",
        "",
    ]

    if not abertos:
        linhas += ["Nenhum serviço em aberto no período. **Em acompanhamento.**", ""]
        return "\n".join(linhas), {"total": 0, "antigos": 0, "por_executor": {}}

    palavra = "serviço em aberto" if len(abertos) == 1 else "serviços em aberto"
    linhas += [f"**{len(abertos)} {palavra}**, assim divididos:", "",
               "| Responsável | Serviços |", "|---|---|"]
    for quem in sorted(por_executor, key=lambda q: -len(por_executor[q])):
        linhas.append(f"| {quem} | {len(por_executor[quem])} |")
    linhas.append("")
    if antigos:
        frase = ("1 serviço está parado" if antigos == 1
                 else f"{antigos} serviços estão parados")
        linhas += [f"**{frase} há mais de um ano.**", ""]
    linhas.append("---")
    linhas.append("")

    for quem in sorted(por_executor, key=lambda q: -len(por_executor[q])):
        meus = por_executor[quem]
        plural = "serviço" if len(meus) == 1 else "serviços"
        linhas += [f"## {quem} — {len(meus)} {plural}", ""]
        arvore = agrupar(meus)
        for piso in pisos_ordenados(arvore):
            linhas += [f"### {piso}", ""]
            for area in sorted(arvore[piso], key=lambda a: sem_acento(a)):
                linhas += [f"**{area}**", ""]
                for x in sorted(arvore[piso][area],
                                key=lambda i: (not i.get("urg"), sem_acento(i.get("fazer") or i.get("nc") or ""))):
                    linhas.append(item_folha(x, hoje))
                linhas.append("")
        linhas.append("---")
        linhas.append("")

    resumo = {"total": len(abertos), "antigos": antigos,
              "por_executor": {q: len(v) for q, v in por_executor.items()}}
    return "\n".join(linhas), resumo


def item_folha(x, hoje):
    # `dataRegistro` e quando o problema foi visto na loja; `relato` e quando
    # entrou nesta folha. O que a gerencia precisa ler e o primeiro.
    texto = limpar(x.get("fazer") or x.get("nc") or "(sem descrição)")
    if x.get("urg"):
        texto = "**[URGENTE]** " + texto

    extras = []
    desde = data_br(x.get("dataRegistro") or x.get("relato"))
    if desde:
        quando = ha_quanto_tempo(desde, hoje)
        extras.append(f"desde {desde.strftime('%d/%m/%Y')}" + (f", {quando}" if quando else ""))

    obs = limpar(x.get("obs"))
    if obs and "VERIFICAR" not in obs.upper():
        # o campo as vezes ja vem escrito com "Obs:" na frente
        extras.append(obs if obs.lower().startswith("obs") else "Obs: " + obs)

    if x.get("orientacao"):
        categoria = CATEGORIA.get(x.get("orientacaoTipo"), "Orientação")
        base = limpar(x.get("orientacaoBase"))
        extras.append(f"{categoria}: " + limpar(x["orientacao"]) + (f" ({base})" if base else ""))

    aviso = verificar_de(x)
    if aviso:
        extras.append("🔒 " + aviso)

    extras += marcador_fotos(x)
    return bloco_item(texto, extras)


def escrever_nc(itens, sigla, hoje):
    abertas = [x for x in itens if em_aberto_nc(x)]
    urgentes = [x for x in abertas if x.get("urgencia") == "URGENTE"]

    antigas = 0
    for x in abertas:
        d = data_br(x.get("relato"))
        if d and (hoje - d).days >= 30:
            antigas += 1

    linhas = [
        "# RELATÓRIO DE NÃO CONFORMIDADE",
        f"## {LOJAS.get(sigla, sigla)}",
        f"### Situação em {hoje.day} de {MESES[hoje.month-1]} de {hoje.year} · {RT_PADRAO}",
        "",
    ]

    if not abertas:
        linhas += ["Nenhuma não conformidade em aberto no período. **Em acompanhamento.**", ""]
        return "\n".join(linhas), {"total": 0, "urgentes": 0, "antigas": 0}

    rotulo = ("não conformidade em aberto" if len(abertas) == 1
              else "não conformidades em aberto")
    linhas += [f"**{len(abertas)} {rotulo}**"
               + (f", sendo **{len(urgentes)} urgentes**." if urgentes else "."), ""]
    if antigas:
        frase = ("1 está em aberto" if antigas == 1 else f"{antigas} estão em aberto")
        linhas += [f"**{frase} há mais de 30 dias.**", ""]
    linhas += ["---", ""]

    arvore = agrupar(abertas)
    for piso in pisos_ordenados(arvore):
        linhas += [f"## {piso}", ""]
        for area in sorted(arvore[piso], key=lambda a: sem_acento(a)):
            linhas += [f"### {area}", ""]
            for x in sorted(arvore[piso][area],
                            key=lambda i: (i.get("urgencia") != "URGENTE",
                                           sem_acento(texto_nc(i)))):
                linhas.append(item_nc(x, hoje))
            linhas.append("")

    return "\n".join(linhas), {"total": len(abertas), "urgentes": len(urgentes),
                               "antigas": antigas}


def texto_nc(x):
    partes = [x.get("texto_tecnico") or x.get("texto_bruto") or ""]
    partes += list(x.get("pontos") or [])
    return " ".join(p for p in partes if p).strip() or "(sem descrição, ver fotos)"


def item_nc(x, hoje):
    selo = "**[URGENTE]**" if x.get("urgencia") == "URGENTE" else "**[OBSERVAÇÃO]**"
    texto = f"{selo} " + limpar(texto_nc(x))

    extras = []
    desde = data_br(x.get("relato"))
    if desde:
        quando = ha_quanto_tempo(desde, hoje)
        extras.append(f"registrada em {desde.strftime('%d/%m/%Y')}" + (f", {quando}" if quando else ""))

    acao = limpar(x.get("acao"))
    if acao:
        extras.append("Ação sugerida: " + acao + " (revisar antes de assinar)")

    if x.get("orientacao"):
        categoria = CATEGORIA.get(x.get("orientacaoTipo"), "Orientação")
        base = limpar(x.get("orientacaoBase"))
        extras.append(f"{categoria}: " + limpar(x["orientacao"]) + (f" ({base})" if base else ""))

    aviso = verificar_de(x)
    if aviso:
        extras.append("🔒 " + aviso)

    extras += marcador_fotos(x)
    return bloco_item(texto, extras)


# --------------------------------------------------------------- saida A4

def markdown_para_html(md, titulo):
    """HTML simples no modelo A4 da biblioteca: abre no navegador, Ctrl+P vira PDF."""
    corpo = []
    for linha in md.splitlines():
        crua = linha.rstrip()
        if not crua:
            continue
        if crua == "---":
            corpo.append('<hr>')
            continue
        nivel = len(crua) - len(crua.lstrip("#"))
        if nivel:
            conteudo = destacar(crua[nivel:].strip())
            corpo.append(f"<h{nivel}>{conteudo}</h{nivel}>")
            continue
        if crua.startswith("|"):
            celulas = [c.strip() for c in crua.strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in celulas):
                continue
            tag = "th" if not any(t.startswith("<tr") for t in corpo[-3:]) else "td"
            corpo.append("<tr>" + "".join(f"<{tag}>{destacar(c)}</{tag}>" for c in celulas) + "</tr>")
            continue
        if crua.startswith("- "):
            corpo.append(f"<p class='item'>{destacar(crua[2:].strip())}</p>")
            continue
        if crua.strip().startswith("[[FOTOS]]"):
            urls = [u for u in crua.strip()[len("[[FOTOS]]"):].split("|") if u]
            tira = "".join(f'<img src="{u}" alt="registro fotográfico">' for u in urls)
            corpo.append(f"<div class='fotos'>{tira}</div>")
            continue
        if crua.startswith("  "):
            corpo.append(f"<p class='detalhe'>{destacar(crua.strip())}</p>")
            continue
        corpo.append(f"<p>{destacar(crua)}</p>")

    juntou = "\n".join(corpo)
    juntou = re.sub(r"(<tr>.*?</tr>\n?)+", lambda m: "<table>" + m.group(0) + "</table>", juntou, flags=re.S)

    return f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{html.escape(titulo)}</title>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  *, *::before, *::after {{ box-sizing: border-box; }}
  html {{ overflow-x: hidden; }}
  body {{ font: 11pt/1.5 Georgia, "Times New Roman", serif; color: #1a1a1a;
         max-width: 178mm; margin: 0 auto; padding: 16px;
         overflow-wrap: anywhere; }}
  table {{ display: block; max-width: 100%; overflow-x: auto; }}
  h1 {{ font-size: 19pt; margin: 0 0 4px; color: #155244; }}
  h2 {{ font-size: 14pt; margin: 22px 0 6px; color: #1d6b57;
        border-bottom: 1.5px solid #bfded4; padding-bottom: 4px; }}
  h3 {{ font-size: 11.5pt; margin: 16px 0 4px; color: #344054; }}
  p {{ margin: 0 0 6px; }}
  p.item {{ margin: 8px 0 2px; white-space: pre-wrap; }}
  /* o enter que ela deu vira quebra de linha tambem no relatorio de leitura */
  p.detalhe {{ white-space: pre-wrap; }}
  p.detalhe {{ margin: 0 0 2px 16px; font-size: 9.5pt; color: #475467; }}
  table {{ border-collapse: collapse; margin: 8px 0 14px; }}
  th, td {{ border: 1px solid #d0d5dd; padding: 5px 10px; font-size: 10pt; text-align: left; }}
  th {{ background: #e8f5f0; }}
  hr {{ border: 0; border-top: 1px solid #d0d5dd; margin: 18px 0; }}
  em {{ color: #667085; font-style: italic; }}
  .fotos {{ display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px 16px; }}
  .fotos img {{ width: 52mm; height: 39mm; object-fit: cover;
                border: 1px solid #d0d5dd; border-radius: 3px; }}
  @media print {{ body {{ padding: 0; }} h2 {{ break-after: avoid; }}
                  p.item {{ break-after: avoid; }}
                  .fotos {{ break-inside: avoid; }}
                  .fotos img {{ break-inside: avoid; }} }}
</style></head><body>
{juntou}
</body></html>"""


def destacar(texto):
    seguro = html.escape(texto)
    seguro = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", seguro)
    seguro = re.sub(r"\*(.+?)\*", r"<em>\1</em>", seguro)
    return seguro


# --------------------------------------------------------------- principal

def main():
    p = argparse.ArgumentParser(description="Gera a folha de manutencao e o relatorio de NC de uma loja.")
    p.add_argument("loja", help="sigla da loja (AC, CF, SF)")
    p.add_argument("--banco", default=r"..\banco-demandas-dados\banco.json")
    p.add_argument("--saida", default=".")
    p.add_argument("--data", help="data do relatorio (AAAA-MM-DD); padrao: hoje")
    args = p.parse_args()

    hoje = datetime.date.fromisoformat(args.data) if args.data else datetime.date.today()
    sigla = args.loja.upper()
    itens = carregar(args.banco, sigla)
    if not itens:
        raise SystemExit(f"Nenhum item da loja {sigla} em {args.banco}")

    saida = pathlib.Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    carimbo = hoje.strftime("%d-%m-%y")
    nome_loja = LOJAS.get(sigla, sigla).split(" — ")[0]

    for titulo, gerar, prefixo in (
        ("FOLHA DE MANUTENCAO", escrever_folha, "FOLHA DE MANUTENCAO"),
        ("RELATORIO DE NAO CONFORMIDADE", escrever_nc, "RELATORIO DE NAO CONFORMIDADE"),
    ):
        md, resumo = gerar(itens, sigla, hoje)
        base = f"{prefixo} - {nome_loja} ({carimbo})"
        (saida / (base + ".md")).write_text(md, encoding="utf-8")
        (saida / (base + ".html")).write_text(markdown_para_html(md, base), encoding="utf-8")
        print(f"{base}")
        for chave, valor in resumo.items():
            print(f"    {chave}: {valor}")

    print()
    print(f"Salvo em: {saida.resolve()}")
    print("Para virar PDF: abrir o .html no navegador e usar Ctrl+P > Salvar como PDF.")


if __name__ == "__main__":
    main()
