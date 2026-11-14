// Conexão com o Neon (Postgres) e criação automática das tabelas.
const { neon } = require("@neondatabase/serverless");

let sql = null;
let pronto = false;

async function conectar() {
  if (!process.env.DATABASE_URL) throw new Error("SEM_BANCO");
  if (!sql) sql = neon(process.env.DATABASE_URL);

  if (!pronto) {
    await sql`CREATE TABLE IF NOT EXISTS carteira_caixinhas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cor TEXT NOT NULL,
      criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS carteira_movimentos (
      id TEXT PRIMARY KEY,
      caixinha_id TEXT NOT NULL REFERENCES carteira_caixinhas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('in', 'out')),
      valor BIGINT NOT NULL CHECK (valor > 0),
      descricao TEXT NOT NULL DEFAULT '',
      data DATE NOT NULL,
      transferencia BOOLEAN NOT NULL DEFAULT false,
      grupo TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS carteira_sessoes (
      token_hash TEXT PRIMARY KEY,
      expira TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS carteira_tentativas (
      ip TEXT NOT NULL,
      quando TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    pronto = true;
  }
  return sql;
}

module.exports = { conectar };
