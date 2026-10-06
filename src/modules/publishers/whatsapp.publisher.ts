import { IPublisher, PublishDealOptions, PublishResult } from './publisher.interface.js';
import { MessageFormatter } from '../bot/formatters/message.js';

export class WhatsAppPublisher implements IPublisher {
  platform: 'WHATSAPP' = 'WHATSAPP';

  private apiUrl?: string;
  private apiKey?: string;

  constructor(options?: { apiUrl?: string; apiKey?: string }) {
    this.apiUrl = options?.apiUrl || process.env.WHATSAPP_API_URL;
    this.apiKey = options?.apiKey || process.env.WHATSAPP_API_KEY;
  }

  async publish(options: PublishDealOptions): Promise<PublishResult> {
    const { chatId, deal } = options;
    const text = MessageFormatter.formatWhatsAppText(deal);

    // Se a API de WhatsApp (ex: Evolution API ou Z-API) estiver configurada
    if (this.apiUrl && this.apiKey) {
      try {
        const payload: any = {
          number: chatId,
          textMessage: {
            text,
          },
        };

        if (deal.imageUrl) {
          payload.mediaMessage = {
            mediatype: 'image',
            caption: text,
            media: deal.imageUrl,
          };
        }

        const response = await fetch(`${this.apiUrl}/message/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data: any = await response.json();
        return {
          success: true,
          messageId: data.key?.id || 'whatsapp_sent',
        };
      } catch (error: any) {
        console.error(`[WhatsAppPublisher] Erro ao enviar para ${chatId}:`, error);
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    }

    // Se o WhatsApp ainda não estiver ativado no .env
    console.log(
      `[WhatsAppPublisher] Integração pronta. Mensagem gerada para ${chatId}:\n${text}`
    );
    return {
      success: true,
      messageId: 'whatsapp_mock_ready',
    };
  }
}
