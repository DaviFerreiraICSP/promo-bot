import { Bot } from 'grammy';
import { env } from '../../config/env.js';
import { handleStartCommand } from './commands/start.js';
import {
  handleTagsCommand,
  handleSetAmazonTag,
  handleSetShopeeTag,
  handleSetMeliTag,
  handleSetMagaluTag,
} from './commands/tags.js';
import {
  handleChannelsCommand,
  handleAddChannel,
  handleRemoveChannel,
  handleFrequencyCommand,
  handleFiltersCommand,
} from './commands/channels.js';
import {
  handleSettingsCommand,
  handleToggleAutoPost,
  handleSetFooter,
  handleRemoveFooter,
  handleSetHeader,
} from './commands/settings.js';
import {
  handlePrivateMessage,
  handleCallbackQuery,
} from './handlers/manualPost.js';

export function createBot(): Bot {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN não foi configurado no .env! O bot não iniciará polling.');
  }

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN || 'dummy_token');

  // Comandos Principais
  bot.command('start', handleStartCommand);
  bot.command('ajuda', handleStartCommand);

  // Comandos de Tags de Afiliados
  bot.command('tags', handleTagsCommand);
  bot.command('tag_amazon', handleSetAmazonTag);
  bot.command('tag_shopee', handleSetShopeeTag);
  bot.command('tag_meli', handleSetMeliTag);
  bot.command('tag_magalu', handleSetMagaluTag);

  // Comandos de Canais
  bot.command('canais', handleChannelsCommand);
  bot.command('add_canal', handleAddChannel);
  bot.command('remover_canal', handleRemoveChannel);
  bot.command('frequencia', handleFrequencyCommand);
  bot.command('filtros', handleFiltersCommand);

  // Comandos de Configurações
  bot.command('config', handleSettingsCommand);
  bot.command('autopost', handleToggleAutoPost);
  bot.command('rodape', handleSetFooter);
  bot.command('remover_rodape', handleRemoveFooter);
  bot.command('cabecalho', handleSetHeader);

  // Callbacks de botões interativos
  bot.on('callback_query:data', handleCallbackQuery);

  // Envio de links / mensagens manuais em privado
  bot.on('message:text', handlePrivateMessage);

  // Tratamento global de erros do bot
  bot.catch((err) => {
    console.error('❌ Erro no Bot Telegram:', err.error);
  });

  return bot;
}
