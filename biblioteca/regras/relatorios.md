# Regras de relatório

Lê **assina** esses documentos com o CRN dela. Um relatório mal feito não é só feio — é risco profissional. Isto vale para relatório de inspeção, higiênico-sanitário, fotográfico, PPR, mensal e financeiro.

## Os 3 caminhos (escolha o certo)

| Situação | Caminho | Por quê |
|---|---|---|
| Relatório **de dentro do site**, para mandar no WhatsApp | `js/pdflite.js` (o gerador que já existe) | Precisa virar arquivo de verdade para anexar. O print do navegador salva o PDF no computador, não gera arquivo para compartilhar. |
| Relatório **bonito, com layout de revista** | `templates/relatorios/modelo-relatorio.html` → Ctrl+P → Salvar como PDF | Fidelidade total: fontes, cores, fotos, tabelas, quebra de página. Zero instalação. |
| Relatório em **Word ou Excel** | Skills `docx` / `xlsx` | Quando a pessoa que recebe precisa editar. |

## Regras de conteúdo (valem sempre)

1. **Toda página se explica sozinha.** Rodapé com unidade, período e data em todas.
2. **Número sempre com a comparação.** "72% conformes" sozinho não diz nada. "72%, contra 61% no mês anterior" diz.
3. **Nunca só a cor.** Toda barra vermelha, todo selo, precisa da palavra escrita ao lado.
4. **Foto sempre com legenda:** o que é, onde foi, data e hora. Foto sem legenda não vale como evidência.
5. **Números alinhados à direita**, com `font-variant-numeric: tabular-nums`. Casas decimais precisam se alinhar entre as linhas.
6. **Tabela nunca corta no meio de uma linha.** O cabeçalho repete em toda página (`thead { display: table-header-group }`).
7. **Assinatura sempre com nome completo, cargo e CRN.** O dado correto é:

   > **Letícia Oliveira** — Nutricionista, Responsável Técnica · **CRN-4 22103217**

   Nunca gerar relatório com CRN de exemplo. Conferir antes de sair.

## Regra crítica: o número que a compromete

Antes de gerar qualquer relatório, **conferir se a nota, o percentual ou a conclusão não depõem contra ela.** Ela assina como responsável técnica. Se um índice ficou baixo, o relatório precisa mostrar junto o plano de correção e o prazo — nunca o número solto.

Na dúvida sobre um número, **perguntar antes de gerar**, não depois de enviar.

## Antes de entregar

- [ ] Aberto e conferido de ponta a ponta (não só a primeira página)
- [ ] Nenhum dado de exemplo sobrou (CRN, nome de loja, datas)
- [ ] Fotos carregaram (nenhum quadrado cinza vazio)
- [ ] Tabela não cortou linha no meio
- [ ] Rodapé aparece em todas as páginas
- [ ] Total das partes bate com o total geral
- [ ] Nenhum número solto sem contexto ou sem plano de correção
