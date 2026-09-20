-- =====================================================================
--  Banco das COPIAS: central-copias
--  E o "armario de backup", separado do banco principal justamente para
--  que um problema no principal nao leve as copias junto.
--  Regra que nao muda: nada e apagado. O expurgo automatico foi tirado
--  em 04/08 e nao volta.
-- =====================================================================

CREATE TABLE IF NOT EXISTS copias (
  id        TEXT PRIMARY KEY,
  data      TEXT NOT NULL,
  tipo      TEXT NOT NULL,             -- diaria | mensal | manual
  n_itens   INTEGER NOT NULL DEFAULT 0,
  n_meta    INTEGER NOT NULL DEFAULT 0,
  n_fotos   INTEGER NOT NULL DEFAULT 0,
  testada   INTEGER NOT NULL DEFAULT 0, -- 1 = ja foi aberta e conferida
  nota      TEXT
);

CREATE INDEX IF NOT EXISTS idx_copias_data ON copias(data);
CREATE INDEX IF NOT EXISTS idx_copias_tipo ON copias(tipo, data);

CREATE TABLE IF NOT EXISTS copias_itens (
  copia_id  TEXT NOT NULL,
  uid       TEXT NOT NULL,
  dados     TEXT NOT NULL,
  mod       TEXT NOT NULL,
  apagado   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (copia_id, uid)
);

CREATE TABLE IF NOT EXISTS copias_meta (
  copia_id  TEXT NOT NULL,
  k         TEXT NOT NULL,
  v         TEXT NOT NULL,
  mod       TEXT NOT NULL,
  PRIMARY KEY (copia_id, k)
);
