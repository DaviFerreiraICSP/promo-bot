import { resolveRedirect } from './unshortener.js';

export class MercadoLivreAffiliate {
  static isMercadoLivreUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host.includes('mercadolivre.com') ||
        host.includes('mercadolivre.com.br') ||
        host === 'meli.la' ||
        host.endsWith('.meli.la') ||
        host === 'mercadolivre.com/sec'
      );
    } catch {
      return false;
    }
  }

  static async convertUrl(rawUrl: string, tag?: string | null): Promise<{
    canonicalUrl: string;
    affiliateUrl: string;
    mlbId: string | null;
  }> {
    let resolvedUrl = rawUrl;

    if (rawUrl.includes('meli.la') || rawUrl.includes('mercadolivre.com/sec')) {
      resolvedUrl = await resolveRedirect(rawUrl);
    }

    let mlbId: string | null = null;
    const match = resolvedUrl.match(/MLB-?(\d+)/i);
    if (match) {
      mlbId = `MLB${match[1]}`;
    }

    let canonicalUrl: string;
    let affiliateUrl: string;

    try {
      const urlObj = new URL(resolvedUrl);
      // Remove parâmetros de afiliados antigos
      urlObj.searchParams.delete('matt_tool');
      urlObj.searchParams.delete('matt_word');
      urlObj.searchParams.delete('tracking_id');
      urlObj.searchParams.delete('source');

      canonicalUrl = urlObj.origin + urlObj.pathname;

      if (tag && tag.trim().length > 0) {
        if (tag.startsWith('http://') || tag.startsWith('https://')) {
          const base = new URL(tag);
          base.searchParams.set('url', canonicalUrl);
          affiliateUrl = base.toString();
        } else {
          urlObj.searchParams.set('matt_tool', tag.trim());
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
      mlbId,
    };
  }
}
