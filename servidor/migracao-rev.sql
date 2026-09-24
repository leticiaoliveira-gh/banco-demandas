-- Migracao unica (24/09/2026): a FILA DE CHEGADA.
-- "rev" = hora em que a NUVEM recebeu a ficha (relogio do servidor).
-- O site passa a baixar "o que chegou desde a ultima vez" por esta hora,
-- e nao pela hora do aparelho que editou (mod). Sem isto, edicao que
-- chegava atrasada nunca aparecia nos outros aparelhos.
-- Rodar uma vez em cada banco:  npx wrangler d1 execute <banco> --remote --file=servidor/migracao-rev.sql

ALTER TABLE itens ADD COLUMN rev TEXT;
UPDATE itens SET rev = mod WHERE rev IS NULL;
CREATE INDEX IF NOT EXISTS idx_itens_rev ON itens(rev, uid);
