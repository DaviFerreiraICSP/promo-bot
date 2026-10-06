import { FormatDealParams } from '../bot/formatters/message.js';

export interface PublishDealOptions {
  chatId: string;
  deal: FormatDealParams & {
    imageUrl?: string | null;
  };
}

export interface PublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IPublisher {
  platform: 'TELEGRAM' | 'WHATSAPP';
  publish(options: PublishDealOptions): Promise<PublishResult>;
}
