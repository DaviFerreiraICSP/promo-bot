import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.js';
import { TenantService } from '../bot/services/tenant.service.js';
import { FilterEngine } from '../filters/filterEngine.js';
import { MetadataScraper } from '../scraper/metadata.js';
import { AffiliateRouter } from '../affiliates/index.js';
import { TelegramPublisher } from '../publishers/telegram.publisher.js';
import { WhatsAppPublisher } from '../publishers/whatsapp.publisher.js';
import { AuthService } from './auth.js';
import { env } from '../../config/env.js';
import { Bot } from 'grammy';

export function registerApiRoutes(fastify: FastifyInstance, bot?: Bot) {
  // ----------------------------------------------------
  // ROTAS PÚBLICAS DE AUTENTICAÇÃO
  // ----------------------------------------------------
  fastify.post('/api/auth/login', async (req: any, reply) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Usuário e senha são obrigatórios.',
      });
    }

    // Compara credenciais com as variáveis de ambiente
    const isValidUser = username.trim() === env.ADMIN_USERNAME.trim();
    const isValidPass = password.trim() === env.ADMIN_PASSWORD.trim();

    if (!isValidUser || !isValidPass) {
      return reply.status(401).send({
        success: false,
        error: 'Credenciais inválidas. Verifique o usuário e a senha.',
      });
    }

    const token = AuthService.generateToken(username);

    return {
      success: true,
      token,
      user: {
        username,
        role: 'ADMIN',
      },
    };
  });

  fastify.get(
    '/api/auth/me',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      return {
        success: true,
        user: req.user,
      };
    }
  );

  // ----------------------------------------------------
  // ROTAS PROTEGIDAS (Exigem Bearer Token)
  // ----------------------------------------------------

  // 1. Estatísticas gerais
  fastify.get(
    '/api/stats',
    { preHandler: [AuthService.requireAuth] },
    async () => {
      const [channelsCount, rulesCount, postsCount, dealsCount] = await Promise.all([
        prisma.channel.count(),
        prisma.filterRule.count(),
        prisma.postHistory.count(),
        prisma.deal.count(),
      ]);

      const recentPosts = await prisma.postHistory.findMany({
        take: 8,
        orderBy: { sentAt: 'desc' },
        include: {
          channel: true,
          deal: true,
          tenant: true,
        },
      });

      return {
        channelsCount,
        rulesCount,
        postsCount,
        dealsCount,
        recentPosts,
      };
    }
  );

  // 2. Tenants (Usuários do sistema)
  fastify.get(
    '/api/tenants',
    { preHandler: [AuthService.requireAuth] },
    async () => {
      return prisma.tenant.findMany({
        include: {
          channels: {
            include: {
              filterRules: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  );

  fastify.put(
    '/api/tenants/:id/tags',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id } = req.params;
      const { amazonTag, shopeeTag, mercadolivreTag, magaluTag, customHeader, customFooter } =
        req.body;

      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          amazonTag,
          shopeeTag,
          mercadolivreTag,
          magaluTag,
          customHeader,
          customFooter,
        },
      });

      return { success: true, tenant: updated };
    }
  );

  // 3. Canais & Frequência
  fastify.get(
    '/api/channels',
    { preHandler: [AuthService.requireAuth] },
    async () => {
      return TenantService.listAllChannels();
    }
  );

  fastify.post(
    '/api/channels',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { tenantId, chatId, name, platform, checkIntervalMinutes } = req.body;

      let finalTenantId = tenantId;
      if (!finalTenantId) {
        let firstTenant = await prisma.tenant.findFirst();
        if (!firstTenant) {
          firstTenant = await prisma.tenant.create({
            data: {
              telegramUserId: 'web_admin',
              name: 'Administrador Web',
            },
          });
        }
        finalTenantId = firstTenant.id;
      }

      const channel = await prisma.channel.create({
        data: {
          tenantId: finalTenantId,
          chatId,
          name: name || chatId,
          platform: platform || 'TELEGRAM',
          checkIntervalMinutes: Number(checkIntervalMinutes) || 15,
          isActive: true,
        },
        include: { filterRules: true },
      });

      return { success: true, channel };
    }
  );

  fastify.delete(
    '/api/channels/:id',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id } = req.params;
      await prisma.channel.delete({ where: { id } });
      return { success: true };
    }
  );

  fastify.put(
    '/api/channels/:id/interval',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id } = req.params;
      const { minutes } = req.body;
      const updated = await TenantService.updateChannelInterval(id, Number(minutes));
      return { success: true, channel: updated };
    }
  );

  // 4. Regras de Filtro de Nicho Granular
  fastify.get(
    '/api/channels/:id/rules',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id } = req.params;
      return TenantService.getChannelRules(id);
    }
  );

  fastify.post(
    '/api/channels/:id/rules',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id: channelId } = req.params;
      const rule = await TenantService.createFilterRule(channelId, req.body);
      return { success: true, rule };
    }
  );

  fastify.put(
    '/api/rules/:id',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id } = req.params;
      const updated = await TenantService.updateFilterRule(id, req.body);
      return { success: true, rule: updated };
    }
  );

  fastify.delete(
    '/api/rules/:id',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { id } = req.params;
      await TenantService.deleteFilterRule(id);
      return { success: true };
    }
  );

  // 5. Testador / Simulador de Filtros em Tempo Real
  fastify.post(
    '/api/deals/test-filter',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { url, rule } = req.body;
      if (!url) {
        return { error: 'URL do produto é obrigatória' };
      }

      const meta = await MetadataScraper.extract(url);
      const converted = await AffiliateRouter.processUrl(url);

      const dealForEval = {
        title: meta.title,
        description: meta.description,
        price: meta.price,
        originalPrice: meta.originalPrice,
        platform: converted.platform,
        category: meta.title.toLowerCase().includes('livro') ? 'Livros' : undefined,
      };

      const evaluation = FilterEngine.evaluate(dealForEval, rule);

      return {
        success: true,
        scraped: {
          title: meta.title,
          price: meta.price,
          originalPrice: meta.originalPrice,
          imageUrl: meta.imageUrl,
          platform: converted.platform,
        },
        evaluation,
      };
    }
  );

  // 6. Publicação Manual Direta via Painel
  fastify.post(
    '/api/deals/manual-publish',
    { preHandler: [AuthService.requireAuth] },
    async (req: any) => {
      const { url, title, price, originalPrice, coupon, channelIds, customFooter } = req.body;

      if (!url || !channelIds || channelIds.length === 0) {
        return { error: 'URL e ao menos um canal são obrigatórios.' };
      }

      if (!bot) {
        return { error: 'Bot do Telegram não inicializado.' };
      }

      const channels = await prisma.channel.findMany({
        where: { id: { in: channelIds } },
        include: { tenant: true },
      });

      const telegramPublisher = new TelegramPublisher(bot);
      const whatsappPublisher = new WhatsAppPublisher();

      let publishedCount = 0;

      for (const channel of channels) {
        const tenant = channel.tenant;
        const affiliateRes = await AffiliateRouter.processUrl(url, {
          amazonTag: tenant.amazonTag,
          shopeeTag: tenant.shopeeTag,
          mercadolivreTag: tenant.mercadolivreTag,
          magaluTag: tenant.magaluTag,
        });

        let metaTitle = title;
        let metaPrice = price;
        let metaOrigPrice = originalPrice;
        let metaImage: string | undefined;

        if (!metaTitle || !metaPrice) {
          const meta = await MetadataScraper.extract(affiliateRes.canonicalUrl);
          if (!metaTitle) metaTitle = meta.title;
          if (!metaPrice) metaPrice = meta.price;
          if (!metaOrigPrice) metaOrigPrice = meta.originalPrice;
          metaImage = meta.imageUrl;
        }

        const dealParams = {
          title: metaTitle || 'Oferta Especial',
          price: metaPrice,
          originalPrice: metaOrigPrice,
          coupon,
          affiliateUrl: affiliateRes.affiliateUrl,
          platform: affiliateRes.platform,
          imageUrl: metaImage,
          customHeader: tenant.customHeader,
          customFooter: customFooter || tenant.customFooter,
        };

        let pubRes;
        if (channel.platform === 'WHATSAPP') {
          pubRes = await whatsappPublisher.publish({
            chatId: channel.chatId,
            deal: dealParams,
          });
        } else {
          pubRes = await telegramPublisher.publish({
            chatId: channel.chatId,
            deal: dealParams,
          });
        }

        if (pubRes.success) {
          publishedCount++;
        }
      }

      return {
        success: true,
        publishedCount,
      };
    }
  );
}
