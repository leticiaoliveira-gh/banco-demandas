"""As fotos que ela me manda, de onde quer que venham.

Nasceu em 25/08/2026, quando ela disse:
  "Eu quero poder te mandar as imagens sempre pelo meu celular ou pelo computador.
   Eu preciso que voce resolva isso. Encontre o que esta fazendo voce nao conseguir
   pegar imagem e resolva."

O QUE ESTAVA ACONTECENDO
  Foto colada na conversa eu enxergo, mas nao vira arquivo no computador dela, e
  sem arquivo nao da para colocar no relatorio. Nao era defeito: era o caminho
  errado. Entao existem dois caminhos que produzem ARQUIVO de verdade:

  COMPUTADOR: ela solta a foto em  Desktop\\FOTOS PARA O CLAUDE\\
  CELULAR:    ela manda pelo Telegram, e o bot ja grava em uploads\\fotos2\\
              (isso ja funcionava desde julho; so ninguem estava usando assim)

USO
    python ferramentas/fotos-dela.py                 # o que chegou nas ultimas 24h
    python ferramentas/fotos-dela.py --horas 72
    python ferramentas/fotos-dela.py --usar 3 --para "C:\\...\\pasta"

O `--usar` copia a foto escolhida para a pasta de destino e a tira da caixa de
entrada do computador, para nao aparecer de novo na proxima vez. Nada e apagado:
a foto do Telegram fica onde esta, e a do computador vai para `ja-usadas`.
"""

import argparse
import datetime
import pathlib
import shutil

DESKTOP = pathlib.Path.home() / "Desktop"

# ONDE O CHAT GUARDA O QUE ELA ANEXA. Era isto que faltava em 25/08: ela mandava
# a foto na conversa, eu enxergava e dizia que nao tinha o arquivo. Tinha: o
# proprio Claude Code grava o anexo aqui, numa pasta por sessao.
CHAT = pathlib.Path.home() / ".claude" / "uploads"
BANCO = (DESKTOP / "CLAUDE (CENTRAL)" / "6. REPOSITORIOS (meus-projetos)"
         / "- Site Trabalho (Claude Code)" / "banco-demandas-dados" / "fotos")
CAIXA = BANCO / "a-classificar"
USADAS = BANCO / "ja-usadas"
TELEGRAM = (DESKTOP / "CLAUDE (CENTRAL)" / "6. REPOSITORIOS (meus-projetos)"
            / "- Site Trabalho (Claude Code)" / "nao-conformidades-uan" / "uploads")

TIPOS = {".jpg", ".jpeg", ".png", ".heic", ".webp"}


def quando(arquivo):
    """A hora do nome (o bot grava AAAAMMDD_HHMMSS) vale mais que a do arquivo:
    copiar para outra pasta muda a data do arquivo, mas nao a do nome."""
    nome = arquivo.name
    try:
        return datetime.datetime.strptime(nome[:15], "%Y%m%d_%H%M%S")
    except ValueError:
        return datetime.datetime.fromtimestamp(arquivo.stat().st_mtime)


def procurar(horas):
    limite = datetime.datetime.now() - datetime.timedelta(hours=horas)
    achadas = []

    if CAIXA.exists():
        for f in CAIXA.iterdir():
            if f.is_file() and f.suffix.lower() in TIPOS:
                achadas.append(("computador", f, quando(f)))

    if CHAT.exists():
        for f in CHAT.rglob("*"):
            if f.is_file() and f.suffix.lower() in TIPOS:
                achadas.append(("mandou no chat", f, quando(f)))

    if TELEGRAM.exists():
        for f in TELEGRAM.rglob("*"):
            if f.is_file() and f.suffix.lower() in TIPOS and quando(f) >= limite:
                achadas.append(("celular (Telegram)", f, quando(f)))

    achadas.sort(key=lambda x: x[2], reverse=True)
    return achadas


def mostrar(achadas):
    if not achadas:
        print("Nenhuma foto nova.")
        print()
        print("  Aqui no chat:  anexe a foto na conversa (o mais rapido)")
        print(f"  Do computador: solte a foto em  {CAIXA}")
        print("                 (a foto ja fica dentro do banco, junto do resto)")
        print("  Do celular:    mande pelo Telegram, para o bot de sempre.")
        return
    print(f"{len(achadas)} foto(s):")
    print()
    for i, (origem, f, q) in enumerate(achadas, 1):
        tamanho = f.stat().st_size / 1024
        print(f"  {i:2}. {q:%d/%m %H:%M}  {origem:20}  {tamanho:6.0f} KB  {f.name}")
    print()
    print("Para usar uma:  python ferramentas/fotos-dela.py --usar N --para \"caminho\"")


def usar(achadas, numero, destino):
    if not 1 <= numero <= len(achadas):
        raise SystemExit(f"Escolha um numero entre 1 e {len(achadas)}.")
    origem, arquivo, _ = achadas[numero - 1]
    destino = pathlib.Path(destino)
    destino.mkdir(parents=True, exist_ok=True)
    alvo = destino / arquivo.name
    shutil.copy2(arquivo, alvo)
    print(f"copiada para: {alvo}")

    # so a do computador sai da caixa de entrada; a do Telegram fica no lugar dela
    if origem == "computador":
        USADAS.mkdir(parents=True, exist_ok=True)
        shutil.move(str(arquivo), str(USADAS / arquivo.name))
        print(f"tirada da caixa de entrada (foi para {USADAS.name}, nada foi apagado)")


def main():
    p = argparse.ArgumentParser(description="As fotos que ela mandou, do celular ou do computador.")
    p.add_argument("--horas", type=int, default=24, help="quanto tempo para tras olhar no Telegram")
    p.add_argument("--usar", type=int, help="numero da foto a usar")
    p.add_argument("--para", help="pasta de destino, quando usar --usar")
    args = p.parse_args()

    CAIXA.mkdir(parents=True, exist_ok=True)
    achadas = procurar(args.horas)

    if args.usar:
        if not args.para:
            raise SystemExit("Falta --para com a pasta de destino.")
        usar(achadas, args.usar, args.para)
    else:
        mostrar(achadas)


if __name__ == "__main__":
    main()
