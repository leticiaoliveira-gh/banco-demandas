# O que foi instalado (25/07/2026)

Você não precisa mexer em nada disso. Está aqui só para você saber o que existe e por quê.

## 1. Frontend Design — o bom gosto

**O que é:** um manual de estilo da própria Anthropic (fabricante do Claude), com 1,1 milhão de instalações.
**O que resolve:** faz o site sair com cara de profissional em vez da "cara de site feito por IA" — tipografia, composição, profundidade, hierarquia.
**Como usar:** nada. Liga sozinho quando eu mexo em visual.

## 2. Web Design Guidelines — o revisor chato (no bom sentido)

**O que é:** mais de 100 regras profissionais de interface, da Vercel (empresa que hospeda meio site grande da internet).
**O que resolve:** exatamente os "detalhezinhos que passaram" — contraste ruim, botão pequeno demais no celular, campo sem nome, foco de teclado invisível, ordem errada dos botões.
**Detalhe importante:** ele busca as regras atualizadas na internet toda vez. Nunca fica velho.
**Como usar:** nada. Rodo antes de publicar.

## 3. Chrome DevTools — os olhos

**O que é:** ferramenta oficial do Google que me deixa abrir o site num navegador de verdade.
**O que resolve:** eu parar de trabalhar no escuro. Agora eu vejo a página, leio os erros escondidos, meço a velocidade e conserto sozinho, sem você precisar mandar print.
**Como usar:** nada. Uso quando termino algo.

## 4. Playwright — o testador

**O que é:** robô que usa o site como se fosse uma pessoa.
**O que resolve:** clicar em tudo, preencher formulário, testar no tamanho de celular e tablet, tirar foto da tela. Encontra o que quebrou antes de você encontrar.
**Como usar:** nada. Uso junto com o de cima.

## 5. Biblioteca de Peças — o catálogo

**O que é:** esta pasta. `templates/pecas/catalogo.html`.
**O que resolve:** o principal — parar de construir tudo do zero. 16 peças prontas e conferidas.
**Como usar:** abre o catálogo com duplo clique, clica em Copiar, me manda.

## 6. Skill "visual do site" — a regra que amarra tudo

**O que é:** uma instrução permanente minha.
**O que resolve:** garante que eu **sempre** puxe da biblioteca antes de inventar, **sempre** confira no navegador antes de dizer que acabei, e **nunca** ponha no seu site nada que exija internet ou programa rodando.

## 7. shadcn — o catálogo premium (para o MONEY e projetos novos)

**O que é:** o catálogo de peças mais usado do mundo hoje, com acesso a várias lojas (Aceternity, Magic UI e outras).
**Onde serve:** no **MONEY** (seu projeto financeiro) e em qualquer projeto novo "montado por programa". **Não** no banco-demandas.
**Como usar:** nada. Eu puxo de lá quando o projeto aceita.

## 8. Flowbite — blocos e páginas inteiras

**O que é:** 60+ peças e páginas completas prontas.
**Onde serve:** no MONEY, e como referência de estrutura para o banco-demandas (eu traduzo para o CSS da casa).

## 9. Context7 — a documentação sempre atualizada

**O que é:** consulta o manual oficial de qualquer biblioteca, na versão de hoje.
**O que resolve:** eu parar de usar instrução velha e gerar código que não funciona mais.

---

## O que NÃO deu para instalar

| Ferramenta | Por quê |
|---|---|
| **21st.dev** | Exige cadastro com chave paga. Não posso pegar nem digitar chave sua — isso é regra fixa. Se você quiser, cria a conta em `21st.dev` e me avisa que eu configuro. Mas o shadcn já cobre quase tudo que ela faria. |
| **daisyUI** | Não existe versão automatizada dela (só página de propaganda). O que ela ensina já está coberto pelo Context7. |

## Uma decisão importante que eu tomei

O **shadcn** e o **Flowbite** ficam instalados e valem para o **MONEY** e para projetos novos — mas **não entram no banco-demandas**.

Motivo: os dois precisam baixar arquivo da internet ou ter programa montando o site. O banco-demandas funciona **sem internet**, instalado no seu celular. Colocar essas peças lá dentro quebraria exatamente o que ele tem de melhor.

Por isso o banco-demandas usa a **biblioteca local** (esta pasta): mesmo resultado visual, zero dependência. As duas coisas convivem — cada projeto puxa da fonte certa.
