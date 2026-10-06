export interface FormatDealParams {
  title: string;
  price?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  coupon?: string | null;
  affiliateUrl: string;
  platform: string;
  customHeader?: string | null;
  customFooter?: string | null;
}

export class MessageFormatter {
  /**
   * Formata uma mensagem em HTML para o Telegram
   */
  static formatTelegramHtml(params: FormatDealParams): {
    caption: string;
    inlineKeyboard: Array<Array<{ text: string; url: string }>>;
  } {
    const lines: string[] = [];

    // 1. Cabeçalho
    const header = params.customHeader || this.getDefaultHeader(params.platform);
    lines.push(`<b>${this.escapeHtml(header)}</b>\n`);

    // 2. Título do Produto
    lines.push(`📦 <b>${this.escapeHtml(params.title)}</b>\n`);

    // 3. Preços
    if (params.originalPrice && params.price && params.originalPrice > params.price) {
      lines.push(`❌ De: <s>${this.formatCurrency(params.originalPrice)}</s>`);
    }

    if (params.price) {
      let priceLine = `🔥 <b>Por: ${this.formatCurrency(params.price)}</b>`;
      if (params.discountPercent && params.discountPercent > 0) {
        priceLine += ` <i>(${params.discountPercent}% OFF)</i>`;
      }
      lines.push(priceLine);
    } else {
      lines.push(`🔥 <b>Preço promocional no link!</b>`);
    }

    // 4. Cupom
    if (params.coupon && params.coupon.trim().length > 0) {
      lines.push(`\n🎟️ Cupom: <code>${this.escapeHtml(params.coupon.trim())}</code> <i>(toque para copiar)</i>`);
    }

    // 5. Link Direto no texto
    lines.push(`\n🛒 <b>Compre aqui:</b> <a href="${params.affiliateUrl}">${params.affiliateUrl}</a>`);

    // 6. Rodapé personalizado
    if (params.customFooter && params.customFooter.trim().length > 0) {
      lines.push(`\n${this.escapeHtml(params.customFooter.trim())}`);
    } else {
      lines.push(`\n⚠️ <i>Preço sujeito a alteração a qualquer momento.</i>`);
    }

    const caption = lines.join('\n');

    // Botão inline interativo
    const inlineKeyboard = [
      [
        {
          text: `🛍️ Comprar na ${this.getPlatformName(params.platform)}`,
          url: params.affiliateUrl,
        },
      ],
    ];

    return { caption, inlineKeyboard };
  }

  /**
   * Formata texto para WhatsApp (formatação padrão com asteriscos e sem HTML)
   */
  static formatWhatsAppText(params: FormatDealParams): string {
    const lines: string[] = [];

    const header = params.customHeader || this.getDefaultHeader(params.platform);
    lines.push(`*${header}*\n`);
    lines.push(`📦 *${params.title}*\n`);

    if (params.originalPrice && params.price && params.originalPrice > params.price) {
      lines.push(`~De: ${this.formatCurrency(params.originalPrice)}~`);
    }

    if (params.price) {
      let priceLine = `🔥 *Por: ${this.formatCurrency(params.price)}*`;
      if (params.discountPercent && params.discountPercent > 0) {
        priceLine += ` (${params.discountPercent}% OFF)`;
      }
      lines.push(priceLine);
    }

    if (params.coupon) {
      lines.push(`\n🎟️ Cupom: *${params.coupon.trim()}*`);
    }

    lines.push(`\n🛒 *Link da oferta:*\n${params.affiliateUrl}`);

    if (params.customFooter) {
      lines.push(`\n${params.customFooter.trim()}`);
    }

    return lines.join('\n');
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private static getDefaultHeader(platform: string): string {
    switch (platform.toUpperCase()) {
      case 'AMAZON':
        return '⚡ OFERTA IMPERDÍVEL AMAZON ⚡';
      case 'SHOPEE':
        return '🟠 ACHADINHO SHOPEE 🟠';
      case 'MERCADOLIVRE':
        return '🟡 OFERTA RELÂMPAGO MERCADO LIVRE 🟡';
      case 'MAGALU':
        return '🔵 PROMOÇÃO MAGAZINE LUIZA 🔵';
      default:
        return '🔥 PROMOÇÃO EXCLUSIVA 🔥';
    }
  }

  private static getPlatformName(platform: string): string {
    switch (platform.toUpperCase()) {
      case 'AMAZON':
        return 'Amazon';
      case 'SHOPEE':
        return 'Shopee';
      case 'MERCADOLIVRE':
        return 'Mercado Livre';
      case 'MAGALU':
        return 'Magalu';
      default:
        return 'Loja';
    }
  }
}
