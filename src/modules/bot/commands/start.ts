import { Context } from 'grammy';
import { TenantService } from '../services/tenant.service.js';

export async function handleStartCommand(ctx: Context) {
  if (!ctx.from) return;

  const userId = String(ctx.from.id);
  const name = ctx.from.first_name || ctx.from.username || 'Usuário';

  await TenantService.findOrCreateTenant(userId, name);

  const welcomeMessage = `
👋 <b>Olá, ${name}! Seja bem-vindo ao PromoBot!</b>

Este bot gerencia e distribui promoções para os seus canais do <b>Telegram</b> e <b>WhatsApp</b> com seus próprios links de afiliados!

<b>🛠️ Como começar:</b>
1️⃣ <b>Configure seus códigos de afiliado:</b>
Use <code>/tags</code> para definir suas tags da Amazon, Shopee, Mercado Livre e Magalu.

2️⃣ <b>Vincule seu canal:</b>
Adicione este bot como <b>Administrador</b> no seu canal e envie <code>/add_canal @nomedoseucanal</code>.

3️⃣ <b>Postagem Manual de Ofertas:</b>
Basta me enviar ou encaminhar qualquer link de produto aqui no chat privado! Eu formato a oferta com sua tag e imagem, e você posta com 1 clique.

4️⃣ <b>Postagem Automática:</b>
O bot monitora ofertas quentes 24/7 e posta automaticamente nos seus canais com seus links!

📌 <b>Comandos úteis:</b>
• <code>/tags</code> - Ver e alterar códigos de afiliados
• <code>/canais</code> - Gerenciar seus canais cadastrados
• <code>/config</code> - Ajustar rodapés e ativar/desativar auto-post
• <code>/ajuda</code> - Guia detalhado de uso
`;

  await ctx.reply(welcomeMessage, { parse_mode: 'HTML' });
}
