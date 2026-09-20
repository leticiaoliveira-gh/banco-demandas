-- =====================================================================
--  CENTRAL DE DEMANDAS - cofre na Cloudflare (Fase 1)
--  Banco principal: central-demandas  (D1 = SQLite)
--
--  Regra de portabilidade: isto e SQLite puro. O mesmo arquivo roda no
--  D1 da Cloudflare, no sqlite3 do computador dela ou em qualquer outro
--  servidor. Nada aqui depende da Cloudflare.
--
--  Nada e apagado de verdade em lugar nenhum: exclusao vira lapide
--  (apagado=1 + mod novo), que e o que faz a exclusao viajar entre os
--  aparelhos e o que permite a volta no tempo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- itens: uma linha por ficha (demanda, servico, compra...).
-- "dados" e o JSON da ficha inteira, do jeito que o site ja usa hoje.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens (
  uid      TEXT PRIMARY KEY,
  dados    TEXT NOT NULL,              -- JSON da ficha
  mod      TEXT NOT NULL,              -- ISO 8601, carimbo da ultima alteracao
  apagado  INTEGER NOT NULL DEFAULT 0, -- 1 = lapide
  tipo     TEXT,                       -- quadro de origem: mnt28, cmp, nc...
  empresa  TEXT,                       -- codigo da loja/empresa
  criado   TEXT NOT NULL
);

-- "o que mudou desde X" nunca pode varrer a tabela inteira
CREATE INDEX IF NOT EXISTS idx_itens_mod     ON itens(mod);
CREATE INDEX IF NOT EXISTS idx_itens_tipo    ON itens(tipo, mod);
CREATE INDEX IF NOT EXISTS idx_itens_empresa ON itens(empresa, mod);

-- ---------------------------------------------------------------------
-- meta: tudo que nao e ficha - configuracoes, nomes de aba, textos que
-- ela reescreveu, listas de area, assinatura. Mesmo par chave/valor do
-- metaSet/metaSetU do site.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta (
  k    TEXT PRIMARY KEY,
  v    TEXT NOT NULL,                  -- JSON
  mod  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meta_mod ON meta(mod);

-- ---------------------------------------------------------------------
-- acessos: as chaves de entrada. Guarda so o HASH da chave (SHA-256),
-- nunca a chave em si - se o banco vazar, ninguem entra com ele.
-- "tipo" diz como ela entrou: digital, senha, aparelho confiavel.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acessos (
  id        TEXT PRIMARY KEY,
  hash      TEXT NOT NULL,
  tipo      TEXT NOT NULL DEFAULT 'chave',
  rotulo    TEXT,                      -- "celular da Le", "computador do trabalho"
  criado    TEXT NOT NULL,
  usado_em  TEXT,
  revogado  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_acessos_hash ON acessos(hash);

-- ---------------------------------------------------------------------
-- sessoes: aparelhos conectados agora. Serve para ela ver "quem esta
-- entrando nos meus dados" e desconectar um aparelho perdido.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessoes (
  id         TEXT PRIMARY KEY,
  acesso_id  TEXT NOT NULL,
  aparelho   TEXT,
  criado     TEXT NOT NULL,
  visto_em   TEXT,
  expira_em  TEXT NOT NULL,
  encerrada  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessoes_acesso ON sessoes(acesso_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);

-- ---------------------------------------------------------------------
-- pareamentos: entrar num aparelho novo sem digitar chave nenhuma.
-- O aparelho ja conectado mostra um codigo curto; o novo digita o codigo
-- e recebe a propria chave. O codigo vale por poucos minutos e uma vez so.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pareamentos (
  codigo     TEXT PRIMARY KEY,
  acesso_id  TEXT,
  aparelho   TEXT,
  criado     TEXT NOT NULL,
  expira_em  TEXT NOT NULL,
  usado      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pareamentos_expira ON pareamentos(expira_em);

-- ---------------------------------------------------------------------
-- ENTRADA COM E-MAIL E SENHA (Parte 3, 20/09/2026)
--
-- usuarios: quem pode entrar no site. Guarda so o HASH da senha (PBKDF2),
-- nunca a senha em si.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  hash_senha  TEXT NOT NULL,
  sal         TEXT NOT NULL,
  criado      TEXT NOT NULL
);

-- acessos ganha o dono (usuario_id): sem isso nao da para saber de quem e
-- cada sessao, nem listar "Computadores conectados" por pessoa.
ALTER TABLE acessos ADD COLUMN usuario_id TEXT;

-- ---------------------------------------------------------------------
-- aprovacoes: o pedido que o computador emprestado faz e que so o celular
-- dela pode aceitar. O codigo de 6 numeros aparece nos DOIS lados; ela
-- confere que sao iguais antes de aprovar, para ninguem aprovar um pedido
-- que nao e o dela.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aprovacoes (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL,
  codigo      TEXT NOT NULL,
  aparelho    TEXT,
  ip          TEXT,
  prazo_min   INTEGER NOT NULL,
  situacao    TEXT NOT NULL DEFAULT 'esperando',  -- esperando | aprovada | negada | expirada
  criado      TEXT NOT NULL,
  expira_em   TEXT NOT NULL,
  acesso_id   TEXT,
  entregue    INTEGER NOT NULL DEFAULT 0,          -- a chave so sai do servidor uma vez
  chave_temp  TEXT                                 -- chave em texto puro, so ate ser entregue
);

CREATE INDEX IF NOT EXISTS idx_aprov_usuario  ON aprovacoes(usuario_id, situacao);
CREATE INDEX IF NOT EXISTS idx_aprov_situacao ON aprovacoes(situacao, expira_em);

-- ---------------------------------------------------------------------
-- codigos_emergencia: os 10 codigos de socorro para quando ela perder o
-- celular. Cada um funciona uma vez so.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS codigos_emergencia (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL,
  hash        TEXT NOT NULL,
  usado_em    TEXT,
  criado      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emerg_usuario ON codigos_emergencia(usuario_id);
