import { Context, InlineKeyboard } from 'grammy';
import { TenantService } from '../services/tenant.service.js';
import { AffiliateRouter } from '../../affiliates/index.js';
import { MetadataScraper } from '../../scraper/metadata.js';
import { DealService } from '../services/deal.service.js';
import { MessageFormatter } from '../formatters/message.js';
import { TelegramPublisher } from '../../publishers/telegram.publisher.js';
import { WhatsAppPublisher } from '../../publishers/whatsapp.publisher.js';
import { prisma } from '../../../db/prisma.js';

export async function handlePrivateMessage(ctx: Context) {
  // Apenas processa mensagens em chats privados e que contenham texto
  if (ctx.chat?.type !== 'private' || !ctx.message?.text || !ctx.from) return;

  const text = ctx.message.text.trim();
  // Ignora se for comando iniciado com barra
  if (text.startsWith('/')) return;

  const urls = AffiliateRouter.extractUrls(text);
  if (urls.length === 0) {
    await ctx.reply(
      '💡 Envie ou encaminhe uma mensagem contendo o link de um produto (Amazon, Shopee, Mercado Livre, Magalu) para eu formatar e postar com a sua tag de afiliado!'
    );
    return;
  }

  const userId = String(ctx.from.id);
  const tenant = await TenantService.findOrCreateTenant(
    userId,
    ctx.from.first_name || 'Usuário'
  );

  const processingMsg = await ctx.reply('⏳ <i>Processando link e gerando prévia...</i>', {
    parse_mode: 'HTML',
  });

  try {
    const rawUrl = urls[0];
    const affiliateResult = await AffiliateRouter.processUrl(rawUrl, {
      amazonTag: tenant.amazonTag,
      shopeeTag: tenant.shopeeTag,
      mercadolivreTag: tenant.mercadolivreTag,
      magaluTag: tenant.magaluTag,
    });

    // Extrai metadados da página
    const meta = await MetadataScraper.extract(affiliateResult.canonicalUrl);

    // Tenta detectar cupom no texto digitado pelo usuário
    let coupon: string | undefined;
    const couponMatch = text.match(/cupom[:\s]+([a-zA-Z0-9_\-]+)/i);
    if (couponMatch) {
      coupon = couponMatch[1];
    }

    // Salva ou atualiza a oferta no banco
    const deal = await DealService.saveDeal({
      dealHash: affiliateResult.dealHash,
      title: meta.title,
      originalUrl: rawUrl,
      canonicalUrl: affiliateResult.canonicalUrl,
      platform: affiliateResult.platform,
      price: meta.price,
      originalPrice: meta.originalPrice,
      imageUrl: meta.imageUrl,
      coupon,
      source: 'MANUAL',
    });

    // Formata prévia
    const { caption, inlineKeyboard } = MessageFormatter.formatTelegramHtml({
      title: deal.title,
      price: deal.price,
      originalPrice: deal.originalPrice,
      coupon: deal.coupon,
      affiliateUrl: affiliateResult.affiliateUrl,
      platform: deal.platform,
      customHeader: tenant.customHeader,
      customFooter: tenant.customFooter,
    });

    const actionKeyboard = new InlineKeyboard()
      .text('🚀 Publicar nos Meus Canais', `publish:${deal.id}`)
      .row()
      .text('❌ Cancelar', `cancel:${deal.id}`);

    // Deleta a mensagem de progresso
    try {
      await ctx.api.deleteMessage(ctx.chat.id, processingMsg.message_id);
    } catch {
      // ignore
    }

    // Envia prévia
    const previewHeader = '📋 <b>PRÉVIA DA SUA PUBLICAÇÃO:</b>\n───────────────────\n';

    if (deal.imageUrl && deal.imageUrl.startsWith('http')) {
      try {
        await ctx.replyWithPhoto(deal.imageUrl, {
          caption: previewHeader + caption,
          parse_mode: 'HTML',
          reply_markup: actionKeyboard,
        });
        return;
      } catch (e) {
        console.warn('Falha ao enviar foto da prévia, enviando texto:', e);
      }
    }

    await ctx.reply(previewHeader + caption, {
      parse_mode: 'HTML',
      reply_markup: actionKeyboard,
    });
  } catch (error: any) {
    console.error('[handlePrivateMessage] Erro ao processar link:', error);
    await ctx.reply(`❌ Ocorreu um erro ao processar o link: ${error.message}`);
  }
}

export async function handleCallbackQuery(ctx: Context) {
  if (!ctx.callbackQuery?.data || !ctx.from) return;

  const data = ctx.callbackQuery.data;
  const userId = String(ctx.from.id);

  if (data.startsWith('cancel:')) {
    await ctx.answerCallbackQuery({ text: 'Publicação cancelada.' });
    if (ctx.callbackQuery.message) {
      await ctx.api.deleteMessage(
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id
      );
    }
    return;
  }

  if (data.startsWith('publish:')) {
    const dealId = data.replace('publish:', '');
    await ctx.answerCallbackQuery({ text: 'Enviando para os seus canais...' });

    const tenant = await TenantService.getTenant(userId);
    if (!tenant || tenant.channels.length === 0) {
      await ctx.reply(
        '⚠️ Você ainda não cadastrou nenhum canal! Use <code>/add_canal @nomedocanal</code> primeiro.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      await ctx.reply('❌ Oferta não encontrada ou expirada.');
      return;
    }

    const affiliateResult = await AffiliateRouter.processUrl(deal.canonicalUrl, {
      amazonTag: tenant.amazonTag,
      shopeeTag: tenant.shopeeTag,
      mercadolivreTag: tenant.mercadolivreTag,
      magaluTag: tenant.magaluTag,
    });

    const telegramPublisher = new TelegramPublisher(ctx.api as any);
    const whatsappPublisher = new WhatsAppPublisher();

    let sentCount = 0;

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
              affiliateUrl: affiliateResult.affiliateUrl,
              platform: deal.platform,
              imageUrl: deal.imageUrl,
              customHeader: tenant.customHeader,
              customFooter: tenant.customFooter,
            },
          });
        } else {
          pubResult = await telegramPublisher.publish({
            chatId: channel.chatId,
            deal: {
              title: deal.title,
              price: deal.price,
              originalPrice: deal.originalPrice,
              coupon: deal.coupon,
              affiliateUrl: affiliateResult.affiliateUrl,
              platform: deal.platform,
              imageUrl: deal.imageUrl,
              customHeader: tenant.customHeader,
              customFooter: tenant.customFooter,
            },
          });
        }

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

        if (pubResult.success) sentCount++;
      } catch (err: any) {
        console.error(`Erro ao postar no canal ${channel.chatId}:`, err);
      }
    }

    // Atualiza mensagem da prévia para confirmar envio
    if (ctx.callbackQuery.message) {
      try {
        await ctx.api.editMessageReplyMarkup(
          ctx.callbackQuery.message.chat.id,
          ctx.callbackQuery.message.message_id,
          { reply_markup: undefined }
        );
      } catch {
        // ignore
      }
    }

    await ctx.reply(
      `🎉 <b>Oferta enviada com sucesso para ${sentCount} canal(is)!</b>`,
      { parse_mode: 'HTML' }
    );
  }
}
