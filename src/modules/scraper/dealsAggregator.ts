import * as cheerio from 'cheerio';

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
  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Coleta promoções em tempo real do Gatry (páginas 1 e 2)
   */
  static async fetchGatryDeals(pages: number = 2): Promise<RawScrapedDeal[]> {
    const deals: RawScrapedDeal[] = [];

    for (let page = 1; page <= pages; page++) {
      try {
        const url = page === 1 ? 'https://gatry.com' : `https://gatry.com/promocoes?pagina=${page}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        if (!response.ok) {
          console.warn(`[DealsAggregator] Gatry retornou HTTP ${response.status} na página ${page}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const articles = $('article').toArray();

        for (const item of articles) {
          const $el = $(item);

          // Título do produto
          const title =
            $el
              .find('h3, h2, a.titulo, .titulo, a')
              .filter((_, a) => $(a).text().trim().length > 10)
              .first()
              .text()
              .trim() ||
            $el.find('h3, h2, a').first().text().trim();

          if (!title || title.length < 5) continue;

          // Preço
          let price: number | undefined;
          const priceMatch = $el.text().match(/R\$\s*([\d\.,]+)/i);
          if (priceMatch) {
            const cleanPrice = priceMatch[1].replace(/\./g, '').replace(',', '.');
            const p = parseFloat(cleanPrice);
            if (!isNaN(p) && p > 0) price = p;
          }

          // Link externo da loja parceira (Amazon, Mercado Livre, Magalu, etc.)
          const allLinks = $el
            .find('a')
            .map((_, a) => $(a).attr('href'))
            .get();

          const externalLink = allLinks.find(
            (href) =>
              href &&
              href.startsWith('http') &&
              !href.includes('gatry.com') &&
              !href.includes('twitter.com') &&
              !href.includes('facebook.com') &&
              !href.includes('instagram.com')
          );

          // Imagem do produto
          const imageUrl = $el.find('img').first().attr('src');

          // Cupom de desconto se houver
          const couponMatch = $el.text().match(/cupom[:\s]+([A-Z0-9_-]+)/i);
          const coupon = couponMatch ? couponMatch[1].trim() : undefined;

          // Link interno do Gatry como sourceUrl
          const internalLink = allLinks.find((href) => href && href.includes('gatry.com/promocao/'));
          const sourceUrl = internalLink || 'https://gatry.com';
          const targetUrl = externalLink || sourceUrl;

          deals.push({
            title,
            sourceUrl,
            targetUrl,
            price,
            imageUrl,
            source: 'GATRY_WEB',
            coupon,
          });
        }
      } catch (error) {
        console.warn(`[DealsAggregator] Erro ao buscar Gatry página ${page}:`, error);
      }
    }

    return deals;
  }

  /**
   * Coleta promoções ativas do Pelando Web
   */
  static async fetchPelandoDeals(): Promise<RawScrapedDeal[]> {
    const deals: RawScrapedDeal[] = [];
    try {
      const response = await fetch('https://www.pelando.com.br/recentes', {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!response.ok) {
        console.warn(`[DealsAggregator] Pelando retornou HTTP ${response.status}`);
        return deals;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const links = $('a[href*="/d/"]').toArray();
      const seen = new Set<string>();

      for (const a of links) {
        let href = $(a).attr('href');
        if (!href) continue;
        if (!href.startsWith('http')) {
          href = `https://www.pelando.com.br${href}`;
        }
        if (seen.has(href)) continue;
        seen.add(href);

        const parent = $(a).closest('article, [class*="sc-"], div:has(h2, h3)');
        const title =
          $(a).attr('title') ||
          $(a).text().trim() ||
          parent.find('h2, h3, a[title]').first().text().trim();

        if (!title || title.length < 5) continue;

        let price: number | undefined;
        const priceMatch = parent.text().match(/R\$\s*([\d\.,]+)/i);
        if (priceMatch) {
          const cleanPrice = priceMatch[1].replace(/\./g, '').replace(',', '.');
          const p = parseFloat(cleanPrice);
          if (!isNaN(p) && p > 0) price = p;
        }

        const imageUrl = parent.find('img').first().attr('src');

        deals.push({
          title,
          sourceUrl: href,
          targetUrl: href,
          price,
          imageUrl,
          source: 'PELANDO_WEB',
        });
      }
    } catch (error) {
      console.warn('[DealsAggregator] Erro ao buscar Pelando Web:', error);
    }

    return deals;
  }

  /**
   * Coleta de todas as fontes disponíveis e deduplica por URL e Título
   */
  static async fetchAll(): Promise<RawScrapedDeal[]> {
    const [gatry, pelando] = await Promise.allSettled([
      this.fetchGatryDeals(2),
      this.fetchPelandoDeals(),
    ]);

    const allDeals: RawScrapedDeal[] = [];
    let gatryCount = 0;
    let pelandoCount = 0;

    if (gatry.status === 'fulfilled') {
      allDeals.push(...gatry.value);
      gatryCount = gatry.value.length;
    }
    if (pelando.status === 'fulfilled') {
      allDeals.push(...pelando.value);
      pelandoCount = pelando.value.length;
    }

    // Deduplicação inteligente
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const uniqueDeals: RawScrapedDeal[] = [];

    for (const deal of allDeals) {
      const normalizedTitle = deal.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      if (seenUrls.has(deal.targetUrl) || (normalizedTitle && seenTitles.has(normalizedTitle))) {
        continue;
      }
      seenUrls.add(deal.targetUrl);
      if (normalizedTitle) seenTitles.add(normalizedTitle);
      uniqueDeals.push(deal);
    }

    console.log(
      `[DealsAggregator] Coleta finalizada: ${uniqueDeals.length} ofertas únicas encontradas (Gatry: ${gatryCount}, Pelando: ${pelandoCount})`
    );

    return uniqueDeals;
  }
}
