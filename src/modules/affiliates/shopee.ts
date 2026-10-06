import { resolveRedirect } from './unshortener.js';

export class ShopeeAffiliate {
  static isShopeeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host.includes('shopee.com.br') ||
        host.includes('shope.ee') ||
        host.includes('s.shopee.com.br')
      );
    } catch {
      return false;
    }
  }

  static async convertUrl(rawUrl: string, tag?: string | null): Promise<{
    canonicalUrl: string;
    affiliateUrl: string;
    productId: string | null;
  }> {
    let resolvedUrl = rawUrl;

    if (rawUrl.includes('shope.ee') || rawUrl.includes('s.shopee.com.br')) {
      resolvedUrl = await resolveRedirect(rawUrl);
    }

    let productId: string | null = null;
    const match = resolvedUrl.match(/-i\.(\d+)\.(\d+)/) || resolvedUrl.match(/\/product\/(\d+)\/(\d+)/);
    if (match) {
      productId = `${match[1]}.${match[2]}`;
    }

    let canonicalUrl: string;
    let affiliateUrl: string;

    try {
      const urlObj = new URL(resolvedUrl);
      // Remove parâmetros de rastreamento de terceiros
      urlObj.searchParams.delete('af_siteid');
      urlObj.searchParams.delete('pid');
      urlObj.searchParams.delete('c');
      urlObj.searchParams.delete('af_sub1');
      urlObj.searchParams.delete('af_sub2');
      urlObj.searchParams.delete('smtt');

      canonicalUrl = urlObj.origin + urlObj.pathname;

      if (tag && tag.trim().length > 0) {
        // Se o tag for uma URL base de afiliado (como universal link da Shopee)
        if (tag.startsWith('http://') || tag.startsWith('https://')) {
          const base = new URL(tag);
          base.searchParams.set('url', canonicalUrl);
          affiliateUrl = base.toString();
        } else {
          // Injeta parâmetro subtag/af_sub_id
          urlObj.searchParams.set('af_sub1', tag.trim());
          affiliateUrl = urlObj.toString();
        }
      } else {
        affiliateUrl = canonicalUrl;
      }
    } catch {
      canonicalUrl = resolvedUrl;
      affiliateUrl = resolvedUrl;
    }

    return {
      canonicalUrl,
      affiliateUrl,
      productId,
    };
  }
}
