import { resolveRedirect } from './unshortener.js';

export class MagaluAffiliate {
  static isMagaluUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host.includes('magazineluiza.com.br') ||
        host.includes('magazinevoce.com.br') ||
        host === 'maga.lu' ||
        host.endsWith('.maga.lu')
      );
    } catch {
      return false;
    }
  }

  static async convertUrl(rawUrl: string, storeTag?: string | null): Promise<{
    canonicalUrl: string;
    affiliateUrl: string;
    productId: string | null;
  }> {
    let resolvedUrl = rawUrl;

    if (rawUrl.includes('maga.lu')) {
      resolvedUrl = await resolveRedirect(rawUrl);
    }

    let productId: string | null = null;
    const match = resolvedUrl.match(/\/p\/([a-zA-Z0-9]+)/);
    if (match) {
      productId = match[1];
    }

    let canonicalUrl: string;
    let affiliateUrl: string;

    try {
      const urlObj = new URL(resolvedUrl);
      canonicalUrl = urlObj.origin + urlObj.pathname;

      if (storeTag && storeTag.trim().length > 0) {
        const cleanTag = storeTag.trim().replace(/^@/, '');
        // Se for uma loja Magazine Você
        // Ex: https://www.magazinevoce.com.br/magazinepromodavi/p/234902100/
        const pathname = urlObj.pathname;
        if (pathname.includes('/p/')) {
          const productPart = pathname.substring(pathname.indexOf('/p/'));
          affiliateUrl = `https://www.magazinevoce.com.br/${cleanTag}${productPart}`;
        } else {
          affiliateUrl = `https://www.magazinevoce.com.br/${cleanTag}`;
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
