// POST /api/caixinhas { nome, saldo, data }   |   DELETE /api/caixinhas?id=...
const crypto = require("crypto");
const { exigirLogin, rota, dataValida } = require("../lib/auth");

const CORES = ["#C8102E", "#C0C5CC", "#8E1B2B", "#E3E6EA", "#EF4B61", "#7D8590"];

module.exports = rota(async (req, res) => {
  const sql = await exigirLogin(req, res);
  if (!sql) return;

  if (req.method === "POST") {
    const { nome, saldo = 0, data } = req.body || {};
    const n = String(nome || "").trim().slice(0, 30);
    if (!n) return res.status(400).json({ erro: "Digite o nome da caixinha." });
    if (!Number.isSafeInteger(saldo) || saldo < 0) return res.status(400).json({ erro: "Saldo inicial inválido." });
    const dia = dataValida(data) ? data : new Date().toISOString().slice(0, 10);

    const [{ total }] = await sql`SELECT count(*)::int AS total FROM carteira_caixinhas`;
    const id = crypto.randomUUID();
    const cor = CORES[total % CORES.length];

    const consultas = [sql`INSERT INTO carteira_caixinhas (id, nome, cor) VALUES (${id}, ${n}, ${cor})`];
    if (saldo > 0) {
      consultas.push(sql`INSERT INTO carteira_movimentos (id, caixinha_id, tipo, valor, descricao, data)
        VALUES (${crypto.randomUUID()}, ${id}, 'in', ${saldo}, 'Saldo inicial', ${dia})`);
    }
    await sql.transaction(consultas);
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = String(req.query.id || "");
    await sql`DELETE FROM carteira_caixinhas WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ erro: "Método não permitido." });
});
