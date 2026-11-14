// GET /api/dados  -> { boxes: [...], moves: [...] }
const { exigirLogin, rota } = require("../lib/auth");

module.exports = rota(async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ erro: "Método não permitido." });
  const sql = await exigirLogin(req, res);
  if (!sql) return;

  const caixinhas = await sql`SELECT id, nome, cor FROM carteira_caixinhas ORDER BY criada_em, id`;
  const movimentos = await sql`
    SELECT id, caixinha_id, tipo, valor, descricao, to_char(data, 'YYYY-MM-DD') AS data, transferencia
    FROM carteira_movimentos
    ORDER BY data DESC, criado_em DESC`;

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    boxes: caixinhas.map((c) => ({ id: c.id, name: c.nome, color: c.cor })),
    moves: movimentos.map((m) => ({
      id: m.id,
      box: m.caixinha_id,
      type: m.tipo,
      value: Number(m.valor),
      desc: m.descricao,
      date: m.data,
      tr: m.transferencia,
    })),
  });
});
