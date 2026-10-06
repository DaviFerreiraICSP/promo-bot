import { Context } from 'grammy';
import { TenantService } from '../services/tenant.service.js';

export async function handleSettingsCommand(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const tenant = await TenantService.getTenant(userId);

  if (!tenant) {
    await ctx.reply('⚠️ Utilize /start primeiro.');
    return;
  }

  const autoPostStatus = tenant.autoPostEnabled ? '🟢 Ativado' : '🔴 Desativado';

  const message = `
⚙️ <b>Suas Configurações:</b>

• <b>Auto-Postagem (24/7):</b> ${autoPostStatus}
• <b>Cabeçalho Customizado:</b> ${tenant.customHeader || '<i>(Padrão do sistema)</i>'}
• <b>Rodapé Customizado:</b> ${tenant.customFooter || '<i>(Padrão do sistema)</i>'}

<b>Comandos de alteração:</b>
• <code>/autopost on</code> ou <code>/autopost off</code> - Ativar ou pausar postagens automáticas
• <code>/rodape Seu texto de rodapé aqui</code> - Alterar rodapé das mensagens
• <code>/remover_rodape</code> - Voltar para o rodapé padrão
• <code>/cabecalho Seu cabeçalho aqui</code> - Alterar cabeçalho padrão
`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handleToggleAutoPost(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const arg = String(ctx.match || '').toLowerCase().trim();

  let enabled: boolean;
  if (arg === 'on' || arg === 'ativar' || arg === 'ligar') {
    enabled = true;
  } else if (arg === 'off' || arg === 'desativar' || arg === 'desligar') {
    enabled = false;
  } else {
    await ctx.reply('Uso: <code>/autopost on</code> ou <code>/autopost off</code>', {
      parse_mode: 'HTML',
    });
    return;
  }

  await TenantService.updateSettings(userId, { autoPostEnabled: enabled });
  await ctx.reply(
    `✅ Auto-postagem ${enabled ? '<b>ATIVADA</b> 🟢' : '<b>DESATIVADA</b> 🔴'}.`,
    { parse_mode: 'HTML' }
  );
}

export async function handleSetFooter(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/rodape 👉 Entre no nosso grupo VIP!</code>', {
      parse_mode: 'HTML',
    });
    return;
  }

  const userId = String(ctx.from.id);
  const footer = String(ctx.match).trim();

  await TenantService.updateSettings(userId, { customFooter: footer });
  await ctx.reply(`✅ <b>Novo rodapé configurado:</b>\n\n${footer}`, {
    parse_mode: 'HTML',
  });
}

export async function handleRemoveFooter(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);

  await TenantService.updateSettings(userId, { customFooter: null });
  await ctx.reply('✅ Rodapé restaurado para o padrão do sistema.');
}

export async function handleSetHeader(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/cabecalho 🔥 OFERTA VIP 🔥</code>', {
      parse_mode: 'HTML',
    });
    return;
  }

  const userId = String(ctx.from.id);
  const header = String(ctx.match).trim();

  await TenantService.updateSettings(userId, { customHeader: header });
  await ctx.reply(`✅ <b>Novo cabeçalho configurado:</b>\n\n${header}`, {
    parse_mode: 'HTML',
  });
}
