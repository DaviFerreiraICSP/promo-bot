import { Context } from 'grammy';
import { TenantService } from '../services/tenant.service.js';

export async function handleChannelsCommand(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const tenant = await TenantService.getTenant(userId);

  if (!tenant) {
    await ctx.reply('⚠️ Utilize /start primeiro.');
    return;
  }

  if (tenant.channels.length === 0) {
    const emptyMsg = `
📢 <b>Nenhum canal cadastrado ainda.</b>

Para cadastrar um canal do Telegram:
1. Adicione este bot como <b>Administrador</b> no seu canal com permissão para postar mensagens.
2. Digite aqui: <code>/add_canal @nomedocanal</code> (ou envie o ID do canal se for privado, ex: <code>-1001234567890</code>).
`;
    await ctx.reply(emptyMsg, { parse_mode: 'HTML' });
    return;
  }

  let list = '📢 <b>Seus Canais Cadastrados:</b>\n\n';
  tenant.channels.forEach((ch, idx) => {
    const status = ch.isActive ? '🟢 Ativo' : '🔴 Inativo';
    list += `${idx + 1}. [${ch.platform}] <b>${ch.name}</b> (<code>${ch.chatId}</code>) - ${status}\n`;
  });

  list += `
\n<b>Para adicionar mais canais:</b>
<code>/add_canal @nomedocanal</code>

<b>Para remover um canal:</b>
<code>/remover_canal @nomedocanal</code>
`;

  await ctx.reply(list, { parse_mode: 'HTML' });
}

export async function handleAddChannel(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply(
      'Uso: <code>/add_canal @nomedocanal</code> ou com ID privado <code>/add_canal -1001234567890</code>\n\n<i>Certifique-se de que o bot já foi adicionado como Administrador no canal!</i>',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const userId = String(ctx.from.id);
  let targetChat = String(ctx.match).trim();

  try {
    // Tenta obter informações do chat via API do Telegram para validar se o bot é admin
    let chatTitle = targetChat;
    try {
      const chatInfo = await ctx.api.getChat(targetChat);
      chatTitle = ('title' in chatInfo && chatInfo.title) ? chatInfo.title : targetChat;
    } catch (apiErr: any) {
      console.warn(`[handleAddChannel] Não foi possível verificar o chat via API imediatamente:`, apiErr?.message);
    }

    await TenantService.addChannel(userId, {
      chatId: targetChat,
      name: chatTitle,
      platform: 'TELEGRAM',
    });

    await ctx.reply(
      `✅ <b>Canal cadastrado com sucesso!</b>\n\nNome: <b>${chatTitle}</b>\nIdentificador: <code>${targetChat}</code>\n\nAs próximas promoções serão enviadas para este canal.`,
      { parse_mode: 'HTML' }
    );
  } catch (error: any) {
    await ctx.reply(`❌ Erro ao adicionar canal: ${error.message}`);
  }
}

export async function handleRemoveChannel(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply('Uso: <code>/remover_canal @nomedocanal</code>', { parse_mode: 'HTML' });
    return;
  }

  const userId = String(ctx.from.id);
  const targetChat = String(ctx.match).trim();

  await TenantService.removeChannel(userId, targetChat);
  await ctx.reply(`🗑️ Canal <code>${targetChat}</code> removido das suas publicações.`, {
    parse_mode: 'HTML',
  });
}

export async function handleFrequencyCommand(ctx: Context) {
  if (!ctx.from || !ctx.match) {
    await ctx.reply(
      'Uso: <code>/frequencia @nomedocanal 15</code> (intervalo em minutos, ex: 15, 30, 60)',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const parts = String(ctx.match).trim().split(/\s+/);
  if (parts.length < 2) {
    await ctx.reply(
      'Uso: <code>/frequencia @nomedocanal 15</code> (informe o canal e os minutos)',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const targetChat = parts[0];
  const minutes = parseInt(parts[1], 10);

  if (isNaN(minutes) || minutes < 1) {
    await ctx.reply('⚠️ Os minutos devem ser um número válido maior que 0.');
    return;
  }

  const userId = String(ctx.from.id);
  const tenant = await TenantService.getTenant(userId);
  const channel = tenant?.channels.find((ch) => ch.chatId === targetChat);

  if (!channel) {
    await ctx.reply(`⚠️ Canal <code>${targetChat}</code> não encontrado na sua lista.`, {
      parse_mode: 'HTML',
    });
    return;
  }

  await TenantService.updateChannelInterval(channel.id, minutes);
  await ctx.reply(
    `⏱️ <b>Frequência atualizada!</b>\nO bot agora verificará ofertas para o canal <b>${channel.name}</b> a cada <b>${minutes} minutos</b>.`,
    { parse_mode: 'HTML' }
  );
}

export async function handleFiltersCommand(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const tenant = await TenantService.getTenant(userId);

  if (!tenant || tenant.channels.length === 0) {
    await ctx.reply('⚠️ Cadastre um canal primeiro com /add_canal.');
    return;
  }

  let text = '🎯 <b>Seus Nichos e Filtros Configurados:</b>\n\n';

  for (const ch of tenant.channels) {
    text += `📢 <b>Canal: ${ch.name}</b> (Intervalo: a cada ${ch.checkIntervalMinutes}m)\n`;
    const rules = await TenantService.getChannelRules(ch.id);

    if (rules.length === 0) {
      text += '  <i>Sem regras específicas (recebe todas as ofertas gerais).</i>\n\n';
    } else {
      rules.forEach((r, idx) => {
        text += `  ${idx + 1}. [${r.category}] <b>${r.name}</b>\n`;
        if (r.brandOrAuthor) text += `     ✍️ Autores/Marcas: <code>${r.brandOrAuthor}</code>\n`;
        if (r.keywordsInclude) text += `     ✅ Termos: <code>${r.keywordsInclude}</code>\n`;
        if (r.keywordsExclude) text += `     🚫 Proibidos: <code>${r.keywordsExclude}</code>\n`;
        if (r.maxPrice) text += `     💰 Preço Máx: R$ ${r.maxPrice}\n`;
      });
      text += '\n';
    }
  }

  text += `💡 <i>Dica: Você pode gerenciar, criar regras detalhadas e testar links no painel web pelo navegador!</i>`;
  await ctx.reply(text, { parse_mode: 'HTML' });
}
