# Minhas caixinhas (Vercel + Neon)

Carteira com login de superadmin. Os dados ficam no banco Postgres do Neon,
então você acessa de qualquer aparelho.

## Como colocar no ar (3 passos)

1. **Suba esta pasta no GitHub** (um repositório novo, por exemplo `carteira`).
2. **Na Vercel**: Add New > Project > escolha o repositório > Deploy.
3. **Em Settings > Environment Variables**, cadastre e faça um novo Deploy:
   - `DATABASE_URL` = a string de conexão do Neon (a mesma do outro projeto serve;
     as tabelas daqui começam com `carteira_` e não mexem nas outras)
   - `ADMIN_USER` = o usuário que você quer usar para entrar
   - `ADMIN_PASSWORD` = uma senha forte

As tabelas são criadas sozinhas no primeiro acesso. Não precisa rodar SQL.

## Estrutura

```
carteira/
├── public/            o site (o que aparece no navegador)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── api/               as rotas do servidor (funções da Vercel)
│   ├── login.js       entrar (usuário e senha do superadmin)
│   ├── logout.js      sair
│   ├── dados.js       lê caixinhas e movimentos
│   ├── caixinhas.js   cria e apaga caixinhas
│   └── movimentos.js  gasta, deposita, transfere e desfaz
├── lib/
│   ├── db.js          conexão com o Neon e criação das tabelas
│   └── auth.js        sessão por cookie e validações
├── package.json
└── vercel.json
```

## Testar no computador (opcional)

```
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

## Segurança

- O usuário e a senha ficam só nas variáveis de ambiente da Vercel, nunca no código.
- O login cria uma sessão com cookie protegido (HttpOnly, Secure, SameSite=Strict) que vale 30 dias.
- Depois de 5 senhas erradas, o IP fica bloqueado por 15 minutos.
- Para trocar a senha: mude `ADMIN_PASSWORD` na Vercel e faça um novo Deploy.
