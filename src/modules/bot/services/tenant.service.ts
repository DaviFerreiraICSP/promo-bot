import { prisma } from '../../../db/prisma.js';

export class TenantService {
  /**
   * Obtém ou cadastra um novo usuário/tenant pelo ID do Telegram
   */
  static async findOrCreateTenant(telegramUserId: string, name: string) {
    const existing = await prisma.tenant.findUnique({
      where: { telegramUserId },
      include: { channels: true },
    });

    if (existing) return existing;

    return prisma.tenant.create({
      data: {
        telegramUserId,
        name,
        role: 'TENANT_ADMIN',
        autoPostEnabled: true,
      },
      include: { channels: true },
    });
  }

  /**
   * Busca tenant pelo telegramUserId
   */
  static async getTenant(telegramUserId: string) {
    return prisma.tenant.findUnique({
      where: { telegramUserId },
      include: { channels: true },
    });
  }

  /**
   * Atualiza tags de afiliado do tenant
   */
  static async updateAffiliateTags(
    telegramUserId: string,
    tags: {
      amazonTag?: string | null;
      shopeeTag?: string | null;
      mercadolivreTag?: string | null;
      magaluTag?: string | null;
    }
  ) {
    return prisma.tenant.update({
      where: { telegramUserId },
      data: {
        ...(tags.amazonTag !== undefined && { amazonTag: tags.amazonTag }),
        ...(tags.shopeeTag !== undefined && { shopeeTag: tags.shopeeTag }),
        ...(tags.mercadolivreTag !== undefined && { mercadolivreTag: tags.mercadolivreTag }),
        ...(tags.magaluTag !== undefined && { magaluTag: tags.magaluTag }),
      },
    });
  }

  /**
   * Atualiza configurações gerais do tenant (rodapé, auto-post, etc.)
   */
  static async updateSettings(
    telegramUserId: string,
    settings: {
      autoPostEnabled?: boolean;
      customHeader?: string | null;
      customFooter?: string | null;
    }
  ) {
    return prisma.tenant.update({
      where: { telegramUserId },
      data: {
        ...(settings.autoPostEnabled !== undefined && {
          autoPostEnabled: settings.autoPostEnabled,
        }),
        ...(settings.customHeader !== undefined && { customHeader: settings.customHeader }),
        ...(settings.customFooter !== undefined && { customFooter: settings.customFooter }),
      },
    });
  }

  /**
   * Adiciona um canal ou grupo ao tenant
   */
  static async addChannel(
    telegramUserId: string,
    channelData: {
      chatId: string;
      name: string;
      platform?: 'TELEGRAM' | 'WHATSAPP';
    }
  ) {
    const tenant = await this.getTenant(telegramUserId);
    if (!tenant) throw new Error('Tenant não encontrado');

    return prisma.channel.upsert({
      where: {
        tenantId_platform_chatId: {
          tenantId: tenant.id,
          platform: channelData.platform || 'TELEGRAM',
          chatId: channelData.chatId,
        },
      },
      update: {
        name: channelData.name,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        chatId: channelData.chatId,
        name: channelData.name,
        platform: channelData.platform || 'TELEGRAM',
        isActive: true,
      },
    });
  }

  /**
   * Remove canal cadastrado
   */
  static async removeChannel(telegramUserId: string, chatId: string) {
    const tenant = await this.getTenant(telegramUserId);
    if (!tenant) throw new Error('Tenant não encontrado');

    return prisma.channel.deleteMany({
      where: {
        tenantId: tenant.id,
        chatId,
      },
    });
  }

  /**
   * Retorna todos os tenants ativos que possuem canais cadastrados e auto-post ligado
   */
  static async getActiveTenantsForAutoPost() {
    return prisma.tenant.findMany({
      where: {
        isActive: true,
        autoPostEnabled: true,
      },
      include: {
        channels: {
          where: { isActive: true },
        },
      },
    });
  }
}
