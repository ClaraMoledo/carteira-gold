// POST /api/login  { usuario, senha }
const crypto = require("crypto");
const { conectar } = require("../lib/db");
const { sha, rota } = require("../lib/auth");

const igual = (a, b) =>
  crypto.timingSafeEqual(Buffer.from(sha(a), "hex"), Buffer.from(sha(b), "hex"));

module.exports = rota(async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });

  const { ADMIN_USER, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return res.status(500).json({ erro: "Falta configurar ADMIN_USER e ADMIN_PASSWORD na Vercel." });
  }

  const sql = await conectar();
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "desconhecido";

  // Limite de tentativas: 5 erros a cada 15 minutos por IP
  await sql`DELETE FROM carteira_tentativas WHERE quando < now() - interval '1 day'`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM carteira_tentativas WHERE ip = ${ip} AND quando > now() - interval '15 minutes'`;
  if (n >= 5) return res.status(429).json({ erro: "Muitas tentativas. Espere 15 minutos e tente de novo." });

  const { usuario = "", senha = "" } = req.body || {};
  if (!(igual(usuario, ADMIN_USER) && igual(senha, ADMIN_PASSWORD))) {
    await sql`INSERT INTO carteira_tentativas (ip) VALUES (${ip})`;
    return res.status(401).json({ erro: "Usuário ou senha incorretos." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await sql`DELETE FROM carteira_sessoes WHERE expira < now()`;
  await sql`DELETE FROM carteira_tentativas WHERE ip = ${ip}`;
  await sql`INSERT INTO carteira_sessoes (token_hash, expira) VALUES (${sha(token)}, now() + interval '30 days')`;

  res.setHeader("Set-Cookie", `sessao=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`);
  res.status(200).json({ ok: true });
});
