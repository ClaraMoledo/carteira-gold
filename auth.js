// Funções de apoio: sessão por cookie, tratamento de erros e validação de datas.
const crypto = require("crypto");
const { conectar } = require("./db");

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

// Envolve cada rota para devolver um erro amigável em vez de quebrar.
function rota(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      if (res.headersSent) return;
      const msg =
        e.message === "SEM_BANCO"
          ? "Falta configurar o DATABASE_URL nas variáveis de ambiente da Vercel."
          : "Erro no servidor. Tente de novo em instantes.";
      res.status(500).json({ erro: msg });
    }
  };
}

function tokenDoCookie(req) {
  const m = /(?:^|;\s*)sessao=([a-f0-9]{64})/.exec(req.headers.cookie || "");
  return m ? m[1] : null;
}

// Devolve a conexão com o banco se a pessoa estiver logada; senão responde 401.
async function exigirLogin(req, res) {
  const sql = await conectar();
  const token = tokenDoCookie(req);
  if (token) {
    const r = await sql`SELECT 1 AS ok FROM carteira_sessoes WHERE token_hash = ${sha(token)} AND expira > now()`;
    if (r.length) return sql;
  }
  res.status(401).json({ erro: "Entre para continuar." });
  return null;
}

function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

module.exports = { sha, rota, tokenDoCookie, exigirLogin, dataValida };
