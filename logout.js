// POST /api/logout
const { conectar } = require("../lib/db");
const { sha, rota, tokenDoCookie } = require("../lib/auth");

module.exports = rota(async (req, res) => {
  const token = tokenDoCookie(req);
  if (token) {
    const sql = await conectar();
    await sql`DELETE FROM carteira_sessoes WHERE token_hash = ${sha(token)}`;
  }
  res.setHeader("Set-Cookie", "sessao=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  res.status(200).json({ ok: true });
});
