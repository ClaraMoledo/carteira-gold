// POST /api/movimentos { tipo: "out" | "in" | "tr", caixinha, para, valor (em centavos), descricao, data }
// DELETE /api/movimentos?id=...
const crypto = require("crypto");
const { exigirLogin, rota, dataValida } = require("../lib/auth");

module.exports = rota(async (req, res) => {
  const sql = await exigirLogin(req, res);
  if (!sql) return;

  if (req.method === "POST") {
    const { tipo, caixinha, para, valor, descricao = "", data } = req.body || {};
    if (!["in", "out", "tr"].includes(tipo)) return res.status(400).json({ erro: "Tipo de movimentação inválido." });
    if (!Number.isSafeInteger(valor) || valor <= 0) return res.status(400).json({ erro: "Digite um valor maior que zero." });
    if (!dataValida(data)) return res.status(400).json({ erro: "Escolha uma data válida." });
    const desc = String(descricao).trim().slice(0, 60);

    const [a] = await sql`SELECT id, nome FROM carteira_caixinhas WHERE id = ${String(caixinha || "")}`;
    if (!a) return res.status(400).json({ erro: "Caixinha não encontrada." });

    if (tipo === "tr") {
      const [b] = await sql`SELECT id, nome FROM carteira_caixinhas WHERE id = ${String(para || "")}`;
      if (!b) return res.status(400).json({ erro: "Caixinha de destino não encontrada." });
      if (b.id === a.id) return res.status(400).json({ erro: "Escolha caixinhas diferentes." });
      const grupo = crypto.randomUUID();
      await sql.transaction([
        sql`INSERT INTO carteira_movimentos (id, caixinha_id, tipo, valor, descricao, data, transferencia, grupo)
          VALUES (${crypto.randomUUID()}, ${a.id}, 'out', ${valor}, ${desc || "Transferência para " + b.nome}, ${data}, true, ${grupo})`,
        sql`INSERT INTO carteira_movimentos (id, caixinha_id, tipo, valor, descricao, data, transferencia, grupo)
          VALUES (${crypto.randomUUID()}, ${b.id}, 'in', ${valor}, ${desc || "Transferência de " + a.nome}, ${data}, true, ${grupo})`,
      ]);
    } else {
      await sql`INSERT INTO carteira_movimentos (id, caixinha_id, tipo, valor, descricao, data)
        VALUES (${crypto.randomUUID()}, ${a.id}, ${tipo}, ${valor}, ${desc}, ${data})`;
    }
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = String(req.query.id || "");
    // Se for uma transferência, apaga os dois lados juntos
    await sql`DELETE FROM carteira_movimentos
      WHERE id = ${id}
         OR (grupo IS NOT NULL AND grupo = (SELECT grupo FROM carteira_movimentos WHERE id = ${id}))`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ erro: "Método não permitido." });
});
