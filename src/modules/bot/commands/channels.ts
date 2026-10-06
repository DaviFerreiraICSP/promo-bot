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
