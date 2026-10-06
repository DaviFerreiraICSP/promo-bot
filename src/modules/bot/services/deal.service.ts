import { Bot } from 'grammy';
import { prisma } from '../../../db/prisma.js';
import { TenantService } from './tenant.service.js';
import { AffiliateRouter } from '../../affiliates/index.js';
import { TelegramPublisher } from '../../publishers/telegram.publisher.js';
import { WhatsAppPublisher } from '../../publishers/whatsapp.publisher.js';

export interface DistributeDealInput {
  title: string;
  targetUrl: string;
  sourceUrl: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  coupon?: string;
  source: string;
}

export class DealService {
  /**
   * Verifica se uma promoção já foi processada recentemente (ex: últimas 24h)
   */
  static async isDuplicate(dealHash: string, hoursAgo: number = 24): Promise<boolean> {
    const sinceDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const existing = await prisma.deal.findFirst({
      where: {
        dealHash,
        createdAt: { gte: sinceDate },
      },
    });
    return !!existing;
  }

  /**
   * Salva uma promoção no banco
   */
  static async saveDeal(data: {
    dealHash: string;
    title: string;
    originalUrl: string;
    canonicalUrl: string;
    platform: string;
    price?: number;
    originalPrice?: number;
    imageUrl?: string;
    coupon?: string;
    source: string;
  }) {
    return prisma.deal.upsert({
      where: { dealHash: data.dealHash },
      update: {
        title: data.title,
        price: data.price,
        originalPrice: data.originalPrice,
        imageUrl: data.imageUrl,
        coupon: data.coupon,
      },
      create: {
        dealHash: data.dealHash,
        title: data.title,
        originalUrl: data.originalUrl,
        canonicalUrl: data.canonicalUrl,
        platform: data.platform,
        price: data.price,
        originalPrice: data.originalPrice,
        imageUrl: data.imageUrl,
        coupon: data.coupon,
        source: data.source,
      },
    });
  }

  /**
   * Distribui uma oferta automaticamente para todos os tenants ativos e seus canais
   */
  static async distributeAutoDeal(dealInput: DistributeDealInput, bot: Bot) {
    // 1. Identifica a URL canônica e hash inicial
    const baseResult = await AffiliateRouter.processUrl(dealInput.targetUrl);

    // 2. Verifica deduplicação
    const isDup = await this.isDuplicate(baseResult.dealHash);
    if (isDup) {
      return { skipped: true, reason: 'DUPLICATE' };
    }

    // 3. Salva no banco de ofertas
    const deal = await this.saveDeal({
      dealHash: baseResult.dealHash,
      title: dealInput.title,
      originalUrl: dealInput.targetUrl,
      canonicalUrl: baseResult.canonicalUrl,
      platform: baseResult.platform,
      price: dealInput.price,
      originalPrice: dealInput.originalPrice,
      imageUrl: dealInput.imageUrl,
      coupon: dealInput.coupon,
      source: dealInput.source,
    });

    // 4. Busca todos os tenants com auto-post ativo
    const tenants = await TenantService.getActiveTenantsForAutoPost();
    if (tenants.length === 0) {
      return { success: true, deliveredCount: 0 };
    }

    const telegramPublisher = new TelegramPublisher(bot);
    const whatsappPublisher = new WhatsAppPublisher();

    let deliveredCount = 0;

    for (const tenant of tenants) {
      if (!tenant.channels || tenant.channels.length === 0) continue;

      // Gera o link de afiliado customizado para esse tenant
      const tenantResult = await AffiliateRouter.processUrl(dealInput.targetUrl, {
        amazonTag: tenant.amazonTag,
        shopeeTag: tenant.shopeeTag,
        mercadolivreTag: tenant.mercadolivreTag,
        magaluTag: tenant.magaluTag,
      });

      for (const channel of tenant.channels) {
        if (!channel.isActive) continue;

        try {
          let pubResult;
          if (channel.platform === 'WHATSAPP') {
            pubResult = await whatsappPublisher.publish({
              chatId: channel.chatId,
              deal: {
                title: deal.title,
                price: deal.price,
                originalPrice: deal.originalPrice,
                coupon: deal.coupon,
                affiliateUrl: tenantResult.affiliateUrl,
                platform: deal.platform,
                imageUrl: deal.imageUrl,
                customHeader: tenant.customHeader,
                customFooter: tenant.customFooter,
              },
            });
          } else {
            // Padrão: Telegram
            pubResult = await telegramPublisher.publish({
              chatId: channel.chatId,
              deal: {
                title: deal.title,
                price: deal.price,
                originalPrice: deal.originalPrice,
                coupon: deal.coupon,
                affiliateUrl: tenantResult.affiliateUrl,
                platform: deal.platform,
                imageUrl: deal.imageUrl,
                customHeader: tenant.customHeader,
                customFooter: tenant.customFooter,
              },
            });
          }

          // Registra histórico
          await prisma.postHistory.create({
            data: {
              dealId: deal.id,
              tenantId: tenant.id,
              channelId: channel.id,
              platform: channel.platform,
              externalMessageId: pubResult.messageId,
              status: pubResult.success ? 'SENT' : 'FAILED',
              error: pubResult.error,
            },
          });

          if (pubResult.success) {
            deliveredCount++;
          }
        } catch (err: any) {
          console.error(
            `[DealService] Falha ao publicar oferta ${deal.id} no canal ${channel.chatId}:`,
            err
          );
        }
      }
    }

    return {
      success: true,
      dealId: deal.id,
      deliveredCount,
    };
  }
}
