import { Context } from 'grammy';
import { TenantService } from '../services/tenant.service.js';

export async function handleTagsCommand(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const tenant = await TenantService.getTenant(userId);

  if (!tenant) {
    await ctx.reply('⚠️ Utilize /start primeiro para iniciar sua conta.');
    return;
  }

  const message = `
🏷️ <b>Suas Tags de Afiliado Atuais:</b>

• <b>Amazon Tag:</b> <code>${tenant.amazonTag || 'Não configurada'}</code>
• <b>Shopee:</b> <code>${tenant.shopeeTag || 'Não configurada'}</code>
• <b>Mercado Livre:</b> <code>${tenant.mercadolivreTag || 'Não configurado'}</code>
• <b>Magalu:</b> <code>${tenant.magaluTag || 'Não configurada'}</code>

<b>Para cadastrar ou atualizar suas tags, use:</b>
• <code>/tag_amazon seutag-20</code>
• <code>/tag_shopee seu_id_ou_link</code>
• <code>/tag_meli seu_codigo_ml</code>
• <code>/tag_magalu sua_loja_magazinevoce</code>
`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handleSetAmazonTag(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/tag_amazon seutag-20</code>', { parse_mode: 'HTML' });
    return;
  }

  const userId = String(ctx.from.id);
  const tag = String(ctx.match).trim();

  await TenantService.updateAffiliateTags(userId, { amazonTag: tag });
  await ctx.reply(`✅ <b>Tag Amazon configurada com sucesso:</b> <code>${tag}</code>`, {
    parse_mode: 'HTML',
  });
}

export async function handleSetShopeeTag(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/tag_shopee seu_id_ou_link</code>', { parse_mode: 'HTML' });
    return;
  }

  const userId = String(ctx.from.id);
  const tag = String(ctx.match).trim();

  await TenantService.updateAffiliateTags(userId, { shopeeTag: tag });
  await ctx.reply(`✅ <b>Tag Shopee configurada com sucesso:</b> <code>${tag}</code>`, {
    parse_mode: 'HTML',
  });
}

export async function handleSetMeliTag(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/tag_meli seu_codigo_afiliado</code>', { parse_mode: 'HTML' });
    return;
  }

  const userId = String(ctx.from.id);
  const tag = String(ctx.match).trim();

  await TenantService.updateAffiliateTags(userId, { mercadolivreTag: tag });
  await ctx.reply(`✅ <b>Tag Mercado Livre configurada com sucesso:</b> <code>${tag}</code>`, {
    parse_mode: 'HTML',
  });
}

export async function handleSetMagaluTag(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/tag_magalu nomedasualoja</code>', { parse_mode: 'HTML' });
    return;
  }

  const userId = String(ctx.from.id);
  const tag = String(ctx.match).trim();

  await TenantService.updateAffiliateTags(userId, { magaluTag: tag });
  await ctx.reply(`✅ <b>Tag Magalu configurada com sucesso:</b> <code>${tag}</code>`, {
    parse_mode: 'HTML',
  });
}
