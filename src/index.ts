import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { createBot } from './modules/bot/bot.js';
import { ScraperWorker } from './modules/scraper/worker.js';
import { registerApiRoutes } from './modules/api/routes.js';

async function bootstrap() {
  console.log('🚀 Inicializando PromoBot Platform...');

  const server = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  await server.register(cors, { origin: '*' });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, '../public');

  // Serve arquivos estáticos da interface web (Dashboard)
  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
  });

  server.get('/dashboard', async (req, reply) => {
    return reply.sendFile('index.html');
  });

  // Rota de Health Check para Railway
  server.get('/health', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // Instancia o Bot Telegram
  const bot = createBot();

  // Registra as rotas REST da API para o Dashboard Web
  registerApiRoutes(server, bot);

  if (env.TELEGRAM_BOT_TOKEN) {
    if (env.TELEGRAM_WEBHOOK_URL) {
      console.log(`🌐 Configurando Telegram Webhook para: ${env.TELEGRAM_WEBHOOK_URL}`);
      await bot.api.setWebhook(`${env.TELEGRAM_WEBHOOK_URL}/telegram/webhook`);

      server.post('/telegram/webhook', async (req, reply) => {
        await bot.handleUpdate(req.body as any);
        return reply.status(200).send({ ok: true });
      });
    } else {
      console.log('📡 Iniciando Telegram em modo Long Polling (desenvolvimento)...');
      bot.start({
        onStart: (info) => {
          console.log(`🤖 Bot @${info.username} conectado com sucesso!`);
        },
      });
    }

    // Inicia o Scraper Worker de promoções em segundo plano
    ScraperWorker.start(bot);
  } else {
    console.warn('⚠️ AVISO: TELEGRAM_BOT_TOKEN não definido. Defina no arquivo .env para ativar o bot.');
  }

  // Inicia servidor HTTP
  try {
    await server.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`✅ Servidor HTTP escutando em http://${env.HOST}:${env.PORT}`);
    console.log(`🩺 Health check disponível em http://${env.HOST}:${env.PORT}/health`);
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor HTTP:', err);
    process.exit(1);
  }

  // Tratamento de encerramento gracioso (Graceful Shutdown)
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Recebido sinal ${signal}. Encerrando com segurança...`);
    try {
      await server.close();
      await prisma.$disconnect();
      console.log('👋 Aplicação encerrada com sucesso.');
      process.exit(0);
    } catch (err) {
      console.error('Erro durante o encerramento:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('❌ Erro fatal no bootstrap da aplicação:', error);
  process.exit(1);
});
