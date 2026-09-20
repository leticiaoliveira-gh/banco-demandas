-- =====================================================================
--  Banco das FOTOS: central-fotos
--  Fica separado do banco principal de proposito: assim a foto (que e
--  pesada) nunca deixa a busca das fichas lenta, e um problema num banco
--  nao leva o outro junto.
--  Uma foto nunca e sobrescrita. Apagar so marca a data - a foto fica na
--  lixeira por 90 dias antes de sair de verdade.
-- =====================================================================

CREATE TABLE IF NOT EXISTS fotos (
  id         TEXT PRIMARY KEY,
  imagem     BLOB NOT NULL,
  mime       TEXT NOT NULL DEFAULT 'image/jpeg',
  tamanho    INTEGER NOT NULL,
  criado     TEXT NOT NULL,
  apagada_em TEXT
);

CREATE INDEX IF NOT EXISTS idx_fotos_criado  ON fotos(criado);
CREATE INDEX IF NOT EXISTS idx_fotos_apagada ON fotos(apagada_em);
