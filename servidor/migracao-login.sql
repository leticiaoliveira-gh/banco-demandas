-- Migracao unica: entrada com e-mail e senha (Parte 3, 20/09/2026).
-- Rodar so uma vez em central-demandas --remote.

CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  hash_senha  TEXT NOT NULL,
  sal         TEXT NOT NULL,
  criado      TEXT NOT NULL
);

ALTER TABLE acessos ADD COLUMN usuario_id TEXT;

CREATE TABLE IF NOT EXISTS aprovacoes (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL,
  codigo      TEXT NOT NULL,
  aparelho    TEXT,
  ip          TEXT,
  prazo_min   INTEGER NOT NULL,
  situacao    TEXT NOT NULL DEFAULT 'esperando',
  criado      TEXT NOT NULL,
  expira_em   TEXT NOT NULL,
  acesso_id   TEXT,
  entregue    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_aprov_usuario  ON aprovacoes(usuario_id, situacao);
CREATE INDEX IF NOT EXISTS idx_aprov_situacao ON aprovacoes(situacao, expira_em);

ALTER TABLE aprovacoes ADD COLUMN chave_temp TEXT;

CREATE TABLE IF NOT EXISTS codigos_emergencia (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL,
  hash        TEXT NOT NULL,
  usado_em    TEXT,
  criado      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emerg_usuario ON codigos_emergencia(usuario_id);
