import { Bot } from 'grammy';
import { IPublisher, PublishDealOptions, PublishResult } from './publisher.interface.js';
import { MessageFormatter } from '../bot/formatters/message.js';

export class TelegramPublisher implements IPublisher {
  platform: 'TELEGRAM' = 'TELEGRAM';

  constructor(private bot: Bot) {}

  async publish(options: PublishDealOptions): Promise<PublishResult> {
    const { chatId, deal } = options;
    const { caption, inlineKeyboard } = MessageFormatter.formatTelegramHtml(deal);

    // 1. Tenta enviar como Foto com legenda e botão inline
    if (deal.imageUrl && deal.imageUrl.startsWith('http')) {
      try {
        const sent = await this.bot.api.sendPhoto(chatId, deal.imageUrl, {
          caption,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        });

        return {
          success: true,
          messageId: String(sent.message_id),
        };
      } catch (photoError: any) {
        console.warn(
          `[TelegramPublisher] Falha ao enviar foto para ${chatId}, tentando enviar apenas texto:`,
          photoError?.message || photoError
        );
      }
    }

    // 2. Fallback: Envia como mensagem de texto formatada
    try {
      const sent = await this.bot.api.sendMessage(chatId, caption, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });

      return {
        success: true,
        messageId: String(sent.message_id),
      };
    } catch (msgError: any) {
      console.error(`[TelegramPublisher] Erro ao enviar mensagem para ${chatId}:`, msgError);
      return {
        success: false,
        error: msgError?.message || String(msgError),
      };
    }
  }
}
