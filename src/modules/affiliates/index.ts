import crypto from 'crypto';
import { AmazonAffiliate } from './amazon.js';
import { ShopeeAffiliate } from './shopee.js';
import { MercadoLivreAffiliate } from './mercadolivre.js';
import { MagaluAffiliate } from './magalu.js';
import { resolveRedirect } from './unshortener.js';

export interface TenantAffiliateConfig {
  amazonTag?: string | null;
  shopeeTag?: string | null;
  mercadolivreTag?: string | null;
  magaluTag?: string | null;
}

export type PlatformType = 'AMAZON' | 'SHOPEE' | 'MERCADOLIVRE' | 'MAGALU' | 'GENERIC';

export interface ConvertedLinkResult {
  platform: PlatformType;
  originalUrl: string;
  canonicalUrl: string;
  affiliateUrl: string;
  dealHash: string; // Hash único para evitar postagens duplicadas
  productIdentifier: string | null;
}

export class AffiliateRouter {
  /**
   * Identifica a plataforma e gera o link de afiliado personalizado para o tenant
   */
  static async processUrl(rawUrl: string, config?: TenantAffiliateConfig): Promise<ConvertedLinkResult> {
    let currentUrl = rawUrl.trim();

    // Se for link encurtador genérico (bit.ly, t.co, etc.), descurta primeiro
    if (
      currentUrl.includes('bit.ly') ||
      currentUrl.includes('t.co') ||
      currentUrl.includes('tinyurl.com') ||
      currentUrl.includes('cutt.ly') ||
      currentUrl.includes('amzn.to') ||
      currentUrl.includes('shope.ee') ||
      currentUrl.includes('meli.la') ||
      currentUrl.includes('maga.lu')
    ) {
      currentUrl = await resolveRedirect(currentUrl);
    }

    if (AmazonAffiliate.isAmazonUrl(currentUrl)) {
      const res = await AmazonAffiliate.convertUrl(currentUrl, config?.amazonTag);
      const hashKey = res.asin ? `amazon:${res.asin}` : res.canonicalUrl;
      return {
        platform: 'AMAZON',
        originalUrl: rawUrl,
        canonicalUrl: res.canonicalUrl,
        affiliateUrl: res.affiliateUrl,
        dealHash: this.generateHash(hashKey),
        productIdentifier: res.asin,
      };
    }

    if (ShopeeAffiliate.isShopeeUrl(currentUrl)) {
      const res = await ShopeeAffiliate.convertUrl(currentUrl, config?.shopeeTag);
      const hashKey = res.productId ? `shopee:${res.productId}` : res.canonicalUrl;
      return {
        platform: 'SHOPEE',
        originalUrl: rawUrl,
        canonicalUrl: res.canonicalUrl,
        affiliateUrl: res.affiliateUrl,
        dealHash: this.generateHash(hashKey),
        productIdentifier: res.productId,
      };
    }

    if (MercadoLivreAffiliate.isMercadoLivreUrl(currentUrl)) {
      const res = await MercadoLivreAffiliate.convertUrl(currentUrl, config?.mercadolivreTag);
      const hashKey = res.mlbId ? `mercadolivre:${res.mlbId}` : res.canonicalUrl;
      return {
        platform: 'MERCADOLIVRE',
        originalUrl: rawUrl,
        canonicalUrl: res.canonicalUrl,
        affiliateUrl: res.affiliateUrl,
        dealHash: this.generateHash(hashKey),
        productIdentifier: res.mlbId,
      };
    }

    if (MagaluAffiliate.isMagaluUrl(currentUrl)) {
      const res = await MagaluAffiliate.convertUrl(currentUrl, config?.magaluTag);
      const hashKey = res.productId ? `magalu:${res.productId}` : res.canonicalUrl;
      return {
        platform: 'MAGALU',
        originalUrl: rawUrl,
        canonicalUrl: res.canonicalUrl,
        affiliateUrl: res.affiliateUrl,
        dealHash: this.generateHash(hashKey),
        productIdentifier: res.productId,
      };
    }

    // Plataforma genérica
    const cleanUrl = currentUrl.split('?')[0];
    return {
      platform: 'GENERIC',
      originalUrl: rawUrl,
      canonicalUrl: cleanUrl,
      affiliateUrl: currentUrl,
      dealHash: this.generateHash(cleanUrl),
      productIdentifier: null,
    };
  }

  /**
   * Extrai todas as URLs de um texto qualquer
   */
  static extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    // Limpa pontuações no final da URL (como . ou , ou ) que podem ter sido pegas no regex)
    return matches.map((url) => url.replace(/[.,;:)\]]+$/, ''));
  }

  private static generateHash(input: string): string {
    return crypto.createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
  }
}
