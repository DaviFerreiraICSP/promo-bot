# 🚀 PromoBot - Bot de Promoções Multi-Tenant (Telegram & WhatsApp)

Plataforma completa para captura, conversão e distribuição automática e manual de promoções com links de afiliados, operando em regime **24h por dia, 7 dias por semana**.

Projetado especificamente para ser leve e eficiente, rodando tranquilamente dentro do plano de **\$5 do Railway** com **PostgreSQL**.

---

## ✨ Recursos Principais

- 👥 **Multi-Tenant (Múltiplos Clientes/Usuários)**:
  - Múltiplas pessoas podem utilizar a mesma instância do bot.
  - Cada usuário cadastra suas próprias tags de afiliado (Amazon, Shopee, Mercado Livre, Magalu).
  - Cada usuário cadastra seus próprios canais/grupos onde o bot é administrador.
  - Cada usuário pode personalizar seu cabeçalho e rodapé de mensagens.

- 🔄 **Conversor Inteligente de Afiliados**:
  - Identifica e descurta links (`amzn.to`, `shope.ee`, `meli.la`, `maga.lu`, `bit.ly`, etc.).
  - Remove tags de outros afiliados e injeta as credenciais do dono do canal.
  - Suporte completo a **Amazon**, **Shopee**, **Mercado Livre** e **Magazine Luiza (Magazine Você)**.

- 🤖 **Modo Híbrido**:
  1. **Automático (24/7)**: Monitora fontes quentes de ofertas (Pelando, Promobit, RSS) periodicamente, deduplica para não repetir ofertas recentes e publica nos canais dos usuários com suas respectivas tags.
  2. **Manual com 1 clique**: O usuário encaminha ou cola um link de produto no privado do bot. O bot raspa título, imagem e preço, monta a prévia com a tag do usuário e disponibiliza o botão `[🚀 Publicar nos Meus Canais]`.

- 💬 **Pronto para Telegram & WhatsApp**:
  - Mensagens formatadas profissionalmente com HTML e botões interativos no Telegram.
  - Interface modular para envio em grupos de WhatsApp via Evolution API, Z-API ou Baileys.

---

## 🛠️ Stack Tecnológica

- **Linguagem**: Node.js 22 + TypeScript
- **Framework do Bot**: [grammY](https://grammy.dev/)
- **Servidor HTTP & Healthcheck**: [Fastify](https://fastify.dev/)
- **ORM & Banco de Dados**: [Prisma](https://www.prisma.io/) com PostgreSQL
- **Scraping de Metadados**: Cheerio
- **Deploy**: Railway (Docker / Nixpacks com reinício automático)

---

## 📋 Comandos Disponíveis no Telegram

| Comando | Descrição |
|---|---|
| `/start` ou `/ajuda` | Registra sua conta e exibe o menu inicial |
| `/tags` | Visualiza suas tags de afiliado configuradas |
| `/tag_amazon <suatag-20>` | Define sua tag de associado Amazon |
| `/tag_shopee <tag_ou_link>` | Define sua tag ou link universal da Shopee |
| `/tag_meli <codigo_afiliado>` | Define sua tag do Mercado Livre |
| `/tag_magalu <loja>` | Define sua loja do Magazine Você |
| `/canais` | Lista seus canais/grupos cadastrados |
| `/add_canal @nomedocanal` | Vincula um canal do Telegram (adicione o bot como admin primeiro) |
| `/remover_canal @nomedocanal` | Desvincula um canal |
| `/config` | Exibe suas preferências atuais |
| `/autopost on` ou `off` | Ativa ou pausa a postagem automática 24/7 nos seus canais |
| `/rodape <seu texto>` | Define um rodapé personalizado para suas mensagens |
| `/remover_rodape` | Restaura o rodapé padrão |
| `/cabecalho <seu texto>` | Define um cabeçalho personalizado |

---

## 🚀 Como Fazer o Deploy no Railway (Passo a Passo)

### 1. Criar o Bot no Telegram
1. Abra o Telegram e procure por `@BotFather`.
2. Envie o comando `/newbot` e siga as instruções para escolher nome e username do seu bot.
3. Guarde o **Token de Acesso** gerado (ex: `7123456789:AAH...`).

### 2. Subir o Projeto no Railway
1. Acesse [railway.app](https://railway.app/) e entre na sua conta paga de \$5.
2. Clique em **New Project** > **Provision PostgreSQL** (para criar o banco de dados).
3. No mesmo projeto, clique em **+ New Service** > **GitHub Repo** e selecione o repositório deste projeto.
4. Na aba **Variables** do serviço da sua aplicação, configure as variáveis de ambiente:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (o Railway sugere isso automaticamente clicando em "Add Reference").
   - `TELEGRAM_BOT_TOKEN`: O token que você recebeu do `@BotFather`.
   - `PORT`: `3000` (ou deixe o Railway definir automaticamente).
   - `ENABLE_AUTO_SCRAPER`: `true`
   - `SCRAPER_INTERVAL_MINUTES`: `10`
   - `NODE_ENV`: `production`
5. Na aba **Settings** do serviço, role até **Networking** e clique em **Generate Domain** (gerará algo como `https://sua-aplicacao.up.railway.app`).
6. Se quiser usar Webhook em vez de polling (opcional):
   - Adicione a variável `TELEGRAM_WEBHOOK_URL` com a URL do domínio gerado (ex: `https://sua-aplicacao.up.railway.app`).

O Railway executará automaticamente o `Dockerfile`, aplicará as tabelas no PostgreSQL com `npx prisma db push` e manterá o bot rodando 24 horas por dia, 7 dias por semana!

---

## 💻 Como Rodar Localmente (Desenvolvimento)

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Crie seu arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
   Preencha o `TELEGRAM_BOT_TOKEN` e a `DATABASE_URL`.

3. Gere o Prisma Client e sincronize o banco de dados:
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

4. Execute em modo de desenvolvimento com hot-reload:
   ```bash
   npm run dev
   ```

5. Para rodar a suíte de testes dos conversores de links de afiliados:
   ```bash
   npx tsx test/test-converters.ts
   ```

---

## 📱 Integração com WhatsApp (Opcional)

Para expandir os envios para grupos de WhatsApp:
1. Configure as variáveis no seu `.env` ou no Railway:
   - `WHATSAPP_API_URL`: URL da sua instância (ex: Evolution API ou Z-API).
   - `WHATSAPP_API_KEY`: Chave de autenticação da API.
2. No banco de dados ou via comando, canais do tipo `WHATSAPP` receberão as mensagens formatadas de acordo com as diretrizes do WhatsApp.
