import * as cheerio from 'cheerio';

export interface ScrapedMetadata {
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
}

export class MetadataScraper {
  /**
   * Raspa metadados OpenGraph, Twitter Cards e Schema.org de uma URL
   */
  static async extract(url: string): Promise<ScrapedMetadata> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 1. Título
      let title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('#productTitle').text().trim() || // Amazon
        $('h1.ui-pdp-title').text().trim() || // Mercado Livre
        $('title').text().trim() ||
        'Oferta Imperdível';

      // Limpeza de sufixos comuns em títulos de e-commerce
      title = title
        .replace(/\s*\|\s*Amazon\.com\.br.*/i, '')
        .replace(/\s*\|\s*Mercado\s*Livre.*/i, '')
        .replace(/\s*\|\s*Shopee\s*Brasil.*/i, '')
        .replace(/\s*\|\s*Magazine\s*Luiza.*/i, '')
        .trim();

      // 2. Imagem
      let imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('#landingImage').attr('src') || // Amazon
        $('img.ui-pdp-image').attr('src'); // ML

      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          imageUrl = new URL(imageUrl, url).toString();
        } catch {
          // ignore
        }
      }

      // 3. Descrição
      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content');

      // 4. Preço via Schema.org JSON-LD
      let price: number | undefined;
      let originalPrice: number | undefined;

      // Procura em scripts ld+json
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const jsonText = $(elem).html();
          if (!jsonText) return;
          const data = JSON.parse(jsonText);

          // Pode ser um array ou objeto simples
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Product' && item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              if (offers && offers.price) {
                const parsed = parseFloat(offers.price);
                if (!isNaN(parsed) && parsed > 0) {
                  price = parsed;
                  break;
                }
              }
            }
          }
        } catch {
          // ignora JSON inválido
        }
      });

      // Se não encontrou no JSON-LD, tenta meta tags de produto
      if (!price) {
        const metaPrice =
          $('meta[property="product:price:amount"]').attr('content') ||
          $('meta[property="og:price:amount"]').attr('content');
        if (metaPrice) {
          const parsed = parseFloat(metaPrice.replace(',', '.'));
          if (!isNaN(parsed)) price = parsed;
        }
      }

      // Preço específico Amazon
      if (!price && url.includes('amazon.')) {
        const priceWhole = $('.a-price-whole').first().text().replace(/[^\d]/g, '');
        const priceFraction = $('.a-price-fraction').first().text().replace(/[^\d]/g, '');
        if (priceWhole) {
          const combined = priceFraction ? `${priceWhole}.${priceFraction}` : priceWhole;
          const parsed = parseFloat(combined);
          if (!isNaN(parsed)) price = parsed;
        }
      }

      // Preço específico Mercado Livre
      if (!price && url.includes('mercadolivre.')) {
        const mlPrice = $('meta[itemprop="price"]').attr('content');
        if (mlPrice) {
          const parsed = parseFloat(mlPrice);
          if (!isNaN(parsed)) price = parsed;
        }
      }

      return {
        title,
        description,
        imageUrl,
        price,
        originalPrice,
      };
    } catch (error) {
      console.warn(`[MetadataScraper] Não foi possível extrair metadados de ${url}:`, error);
      return {
        title: 'Oferta Especial',
      };
    }
  }
}
