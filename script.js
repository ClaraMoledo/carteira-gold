/* Minhas caixinhas - lógica do site (versão com banco de dados na Vercel + Neon) */
const $ = id => document.getElementById(id);
const brl = c => (c / 100).toLocaleString("pt-BR", {style: "currency", currency: "BRL"});
const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[ch]));
const today = () => new Date().toLocaleDateString("sv");
const fdate = d => d.split("-").reverse().join("/");

let boxes = [], moves = [], filter = null, type = "out", pend = null, busy = false;

/* ---------- conversa com a API ---------- */
async function api(url, method = "GET", body) {
  const r = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? {"Content-Type": "application/json"} : {},
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await r.json(); } catch (e) {}
  if (r.status === 401 && url !== "/api/login") {
    showAuth();
    throw new Error("Sua sessão acabou. Entre de novo.");
  }
  if (!r.ok) throw new Error(data.erro || "Algo deu errado. Tente de novo.");
  return data;
}

function status(t, bad) {
  const el = $("sync");
  el.textContent = t;
  el.className = "empty" + (bad ? " out" : "");
}

function cents(str) {
  let s = String(str).trim().replace(/[^\d.,-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 100) : NaN;
}

/* ---------- telas ---------- */
function showAuth() {
  $("loading").classList.add("hide");
  $("app").classList.add("hide");
  $("auth").classList.remove("hide");
  $("authMsg").textContent = "";
}

async function carregar() {
  const d = await api("/api/dados");
  boxes = d.boxes;
  moves = d.moves;
  $("loading").classList.add("hide");
  $("auth").classList.add("hide");
  $("app").classList.remove("hide");
  if (!$("mdt").value) $("mdt").value = today();
  render();
}

// Executa uma ação, recarrega os dados do banco e mostra o resultado
async function agir(fn, msgEl) {
  if (busy) return false;
  busy = true;
  status("Salvando...");
  try {
    await fn();
    await carregar();
    status("Tudo salvo no banco de dados");
    return true;
  } catch (e) {
    status(e.message, true);
    if (msgEl) msgEl.textContent = e.message;
    return false;
  } finally {
    busy = false;
  }
}

/* ---------- login ---------- */
$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("authMsg");
  msg.textContent = "";
  $("authBtn").disabled = true;
  try {
    await api("/api/login", "POST", {usuario: $("u").value.trim(), senha: $("p").value});
    $("p").value = "";
    await carregar();
    status("Conectado ao banco de dados");
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    $("authBtn").disabled = false;
  }
});

$("logout").onclick = async () => {
  try { await api("/api/logout", "POST", {}); } catch (e) {}
  showAuth();
};

/* ---------- cálculos ---------- */
const bal = id => moves.filter(m => m.box === id).reduce((s, m) => s + (m.type === "in" ? m.value : -m.value), 0);
const boxName = id => (boxes.find(b => b.id === id) || {name: "(apagada)"}).name;
const boxColor = id => (boxes.find(b => b.id === id) || {color: "#888"}).color;

function render() {
  $("total").textContent = brl(boxes.reduce((s, b) => s + bal(b.id), 0));
  const ym = today().slice(0, 7);
  $("month").textContent = brl(moves.filter(m => m.type === "out" && !m.tr && m.date.startsWith(ym)).reduce((s, m) => s + m.value, 0));

  $("boxes").innerHTML = boxes.length ? boxes.map(b => {
    const v = bal(b.id);
    return `<div class="box ${filter === b.id ? "sel" : ""}" style="--c:${b.color}">
      <div><b>${esc(b.name)}</b><span class="row" style="margin-top:.25rem">
        <button class="small" data-act="filter" data-id="${b.id}">Ver movimentos</button>
        <button class="small ${pend === "b" + b.id ? "danger" : ""}" data-act="delbox" data-id="${b.id}">${pend === "b" + b.id ? "Apagar mesmo?" : "Apagar"}</button></span></div>
      <div class="v ${v < 0 ? "out" : ""}">${brl(v)}</div></div>`;
  }).join("") : `<p class="empty">Nenhuma caixinha ainda. Crie a primeira abaixo.</p>`;

  const opts = boxes.map(b => `<option value="${b.id}">${esc(b.name)} (${brl(bal(b.id))})</option>`).join("");
  const keepA = $("mb").value, keepB = $("mt").value;
  $("mb").innerHTML = opts;
  $("mt").innerHTML = opts;
  if (keepA) $("mb").value = keepA;
  if (keepB) $("mt").value = keepB;

  const list = moves.filter(m => !filter || m.box === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
  $("histT").textContent = filter ? "Histórico de " + boxName(filter) : "Histórico";
  $("clearF").classList.toggle("hide", !filter);
  $("hist").innerHTML = list.length ? list.map(m => `<div class="mv">
      <span class="d">${fdate(m.date)}</span>
      <span class="t">${esc(m.desc || (m.type === "in" ? "Depósito" : "Gasto"))}<small><span style="color:${boxColor(m.box)}">●</span> ${esc(boxName(m.box))}</small></span>
      <span class="a ${m.type}">${m.type === "in" ? "+" : "−"} ${brl(m.value)}</span>
      <span class="x"><button class="small ${pend === "m" + m.id ? "danger" : ""}" data-act="delmv" data-id="${m.id}">${pend === "m" + m.id ? "Desfazer mesmo?" : "Desfazer"}</button></span>
    </div>`).join("") : `<p class="empty">Nenhuma movimentação ainda.</p>`;
}

/* ---------- ações ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;

  if (act === "filter") {
    filter = (filter === id ? null : id);
    return render();
  }
  if (act === "delbox") {
    if (pend !== "b" + id) { pend = "b" + id; return render(); }
    pend = null;
    if (filter === id) filter = null;
    await agir(() => api("/api/caixinhas?id=" + encodeURIComponent(id), "DELETE"));
  }
  if (act === "delmv") {
    if (pend !== "m" + id) { pend = "m" + id; return render(); }
    pend = null;
    await agir(() => api("/api/movimentos?id=" + encodeURIComponent(id), "DELETE"));
  }
});

$("clearF").onclick = () => { filter = null; render(); };

$("boxForm").addEventListener("submit", async e => {
  e.preventDefault();
  const nome = $("bn").value.trim();
  if (!nome) return;
  const saldo = $("bv").value.trim() ? cents($("bv").value) : 0;
  if (isNaN(saldo) || saldo < 0) return status("Saldo inicial inválido.", true);
  const ok = await agir(() => api("/api/caixinhas", "POST", {nome, saldo, data: today()}));
  if (ok) { $("bn").value = ""; $("bv").value = ""; }
});

$("seg").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  type = b.dataset.t;
  [...$("seg").children].forEach(x => x.setAttribute("aria-pressed", x === b));
  $("toWrap").classList.toggle("hide", type !== "tr");
  $("mbL").textContent = type === "tr" ? "De a caixinha" : "Caixinha";
});

$("mvForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("mvMsg");
  msg.textContent = "";
  const box = $("mb").value, v = cents($("mv").value);
  if (!box) return msg.textContent = "Crie uma caixinha antes de registrar.";
  if (!(v > 0)) return msg.textContent = "Digite um valor maior que zero.";
  if (type === "tr" && $("mt").value === box) return msg.textContent = "Escolha caixinhas diferentes.";
  const ok = await agir(() => api("/api/movimentos", "POST", {
    tipo: type,
    caixinha: box,
    para: $("mt").value,
    valor: v,
    descricao: $("md").value.trim(),
    data: $("mdt").value
  }), msg);
  if (ok) { $("mv").value = ""; $("md").value = ""; }
});

/* ---------- modo claro / escuro ---------- */
const mq = window.matchMedia("(prefers-color-scheme: dark)");
function curTheme() { return document.documentElement.dataset.theme || (mq.matches ? "dark" : "light"); }
function paintTheme() { $("theme").textContent = curTheme() === "dark" ? "Modo claro" : "Modo escuro"; }
try { const t = localStorage.getItem("carteira_theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
$("theme").onclick = () => {
  const t = curTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("carteira_theme", t); } catch (e) {}
  paintTheme();
};
mq.addEventListener("change", paintTheme);
paintTheme();

/* ---------- início ---------- */
(async function init() {
  try {
    await carregar();
    status("Conectado ao banco de dados");
  } catch (e) {
    // 401 já mostra a tela de login; qualquer outro erro aparece no lugar do "Carregando"
    if ($("auth").classList.contains("hide")) {
      $("loading").textContent = e.message;
      $("loading").className = "msg";
    }
  }
})();
