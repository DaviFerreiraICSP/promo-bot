import * as cheerio from 'cheerio';
import { resolveRedirect } from '../affiliates/unshortener.js';
import { AffiliateRouter } from '../affiliates/index.js';

export interface RawScrapedDeal {
  title: string;
  sourceUrl: string;
  targetUrl: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  source: string;
  coupon?: string;
}

export class DealsAggregator {
  /**
   * Coleta promoções do feed RSS do Pelando
   */
  static async fetchPelandoDeals(): Promise<RawScrapedDeal[]> {
    const deals: RawScrapedDeal[] = [];
    try {
      const feedUrl = 'https://www.pelando.com.br/rss';
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) return deals;

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      const items = $('item').slice(0, 15).toArray();

      for (const item of items) {
        const $item = $(item);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const description = $item.find('description').text().trim();
        const enclosureUrl = $item.find('enclosure').attr('url');

        // Extrai preço do título ou descrição (ex: R$ 199,90 ou 199.90)
        let price: number | undefined;
        const priceMatch = (title + ' ' + description).match(/R\$\s*([\d\.,]+)/i);
        if (priceMatch) {
          const cleanPrice = priceMatch[1].replace(/\./g, '').replace(',', '.');
          const p = parseFloat(cleanPrice);
          if (!isNaN(p)) price = p;
        }

        // Tenta achar links para as lojas alvo no conteúdo
        const urlsInDesc = AffiliateRouter.extractUrls(description);
        let targetUrl = link;

        for (const u of urlsInDesc) {
          if (
            u.includes('amazon') ||
            u.includes('shopee') ||
            u.includes('mercadolivre') ||
            u.includes('magazineluiza') ||
            u.includes('amzn.to') ||
            u.includes('shope.ee')
          ) {
            targetUrl = u;
            break;
          }
        }

        deals.push({
          title,
          sourceUrl: link,
          targetUrl,
          price,
          imageUrl: enclosureUrl,
          source: 'PELANDO_RSS',
        });
      }
    } catch (error) {
      console.warn('[DealsAggregator] Erro ao buscar Pelando RSS:', error);
    }

    return deals;
  }

  /**
   * Coleta promoções do feed público Promobit
   */
  static async fetchPromobitDeals(): Promise<RawScrapedDeal[]> {
    const deals: RawScrapedDeal[] = [];
    try {
      const feedUrl = 'https://www.promobit.com.br/feed/';
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) return deals;

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      const items = $('item').slice(0, 15).toArray();

      for (const item of items) {
        const $item = $(item);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const description = $item.find('description').text().trim();
        const enclosureUrl = $item.find('enclosure').attr('url');

        let price: number | undefined;
        const priceMatch = (title + ' ' + description).match(/R\$\s*([\d\.,]+)/i);
        if (priceMatch) {
          const cleanPrice = priceMatch[1].replace(/\./g, '').replace(',', '.');
          const p = parseFloat(cleanPrice);
          if (!isNaN(p)) price = p;
        }

        deals.push({
          title,
          sourceUrl: link,
          targetUrl: link,
          price,
          imageUrl: enclosureUrl,
          source: 'PROMOBIT_RSS',
        });
      }
    } catch (error) {
      console.warn('[DealsAggregator] Erro ao buscar Promobit RSS:', error);
    }

    return deals;
  }

  /**
   * Coleta de todas as fontes disponíveis
   */
  static async fetchAll(): Promise<RawScrapedDeal[]> {
    const [pelando, promobit] = await Promise.allSettled([
      this.fetchPelandoDeals(),
      this.fetchPromobitDeals(),
    ]);

    const allDeals: RawScrapedDeal[] = [];
    if (pelando.status === 'fulfilled') allDeals.push(...pelando.value);
    if (promobit.status === 'fulfilled') allDeals.push(...promobit.value);

    return allDeals;
  }
}
