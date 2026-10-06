import { resolveRedirect } from './unshortener.js';

export class AmazonAffiliate {
  /**
   * Verifica se o link é da Amazon ou um encurtador oficial
   */
  static isAmazonUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'a.co' ||
        host.endsWith('.a.co') ||
        host === 'amzn.to' ||
        host.endsWith('.amzn.to') ||
        host === 'amzn.eu' ||
        host.endsWith('.amzn.eu') ||
        host.includes('amazon.')
      );
    } catch {
      return false;
    }
  }

  /**
   * Extrai o código ASIN (Amazon Standard Identification Number)
   */
  static extractAsin(url: string): string | null {
    // Padrões comuns: /dp/B08N5WRWNW, /gp/product/B08N5WRWNW, /d/B08N5WRWNW
    const asinMatch = url.match(/(?:\/dp\/|\/gp\/product\/|\/d\/|\/ASIN\/)([A-Z0-9]{10})/i);
    return asinMatch ? asinMatch[1].toUpperCase() : null;
  }

  /**
   * Converte uma URL qualquer da Amazon para o link de afiliado do Tenant
   */
  static async convertUrl(rawUrl: string, tag?: string | null): Promise<{
    canonicalUrl: string;
    affiliateUrl: string;
    asin: string | null;
  }> {
    let resolvedUrl = rawUrl;

    // Se for link encurtado (ex: amzn.to), resolve o redirecionamento
    if (rawUrl.includes('amzn.to') || rawUrl.includes('a.co')) {
      resolvedUrl = await resolveRedirect(rawUrl);
    }

    const asin = this.extractAsin(resolvedUrl);

    let canonicalUrl: string;
    let affiliateUrl: string;

    if (asin) {
      // Normaliza para o domínio amazon.com.br por padrão (ou mantém o TLD se já especificado)
      let domain = 'www.amazon.com.br';
      try {
        const parsed = new URL(resolvedUrl);
        if (parsed.hostname.includes('amazon.')) {
          domain = parsed.hostname;
        }
      } catch {
        // fallback
      }

      canonicalUrl = `https://${domain}/dp/${asin}`;
      if (tag && tag.trim().length > 0) {
        affiliateUrl = `${canonicalUrl}?tag=${encodeURIComponent(tag.trim())}`;
      } else {
        affiliateUrl = canonicalUrl;
      }
    } else {
      // Caso não encontre ASIN (ex: página de categoria ou busca), apenas limpa os parâmetros de tag antigos
      try {
        const urlObj = new URL(resolvedUrl);
        urlObj.searchParams.delete('tag');
        urlObj.searchParams.delete('linkCode');
        urlObj.searchParams.delete('ascsubtag');
        urlObj.searchParams.delete('ref');
        urlObj.searchParams.delete('ref_');

        canonicalUrl = urlObj.toString();

        if (tag && tag.trim().length > 0) {
          urlObj.searchParams.set('tag', tag.trim());
          affiliateUrl = urlObj.toString();
        } else {
          affiliateUrl = canonicalUrl;
        }
      } catch {
        canonicalUrl = resolvedUrl;
        affiliateUrl = resolvedUrl;
      }
    }

    return {
      canonicalUrl,
      affiliateUrl,
      asin,
    };
  }
}
