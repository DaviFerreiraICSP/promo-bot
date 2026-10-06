export interface FilterEvaluationDeal {
  title: string;
  description?: string;
  price?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  category?: string | null;
  platform?: string;
  rawUrl?: string;
}

export interface FilterRuleConfig {
  id?: string;
  name: string;
  category: string; // LIVROS, TECH, CASA, GAMES, MODA, BELEZA, TODOS
  keywordsInclude?: string | null; // e.g. "teologia, doutrina, graça"
  keywordsExclude?: string | null; // e.g. "autoajuda, romance"
  brandOrAuthor?: string | null; // e.g. "Vida Nova, Thomas Nelson, John Piper, C.S. Lewis"
  minPrice?: number | null;
  maxPrice?: number | null;
  minDiscountPercent?: number | null;
  checkIntervalMinutes?: number;
  lastCheckedAt?: Date | null;
  isActive?: boolean;
}

export interface FilterEvaluationResult {
  matches: boolean;
  reasons: string[];
  failedAt?: 'CATEGORY' | 'NEGATIVE_KEYWORD' | 'BRAND_OR_AUTHOR' | 'REQUIRED_KEYWORDS' | 'PRICE' | 'DISCOUNT' | 'INTERVAL';
}

export class FilterEngine {
  /**
   * Normaliza texto para comparação case-insensitive e sem acentos
   */
  static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Divide uma string separada por vírgula em lista de termos limpos
   */
  static splitTerms(commaSeparated?: string | null): string[] {
    if (!commaSeparated) return [];
    return commaSeparated
      .split(',')
      .map((term) => this.normalize(term))
      .filter((term) => term.length > 0);
  }

  /**
   * Verifica se o tempo de intervalo da regra já decorreu
   */
  static isDue(lastCheckedAt?: Date | null, intervalMinutes: number = 15): boolean {
    if (!lastCheckedAt) return true;
    const elapsedMinutes = (Date.now() - new Date(lastCheckedAt).getTime()) / (1000 * 60);
    return elapsedMinutes >= intervalMinutes;
  }

  /**
   * Avalia uma promoção contra uma regra de nicho granular
   */
  static evaluate(deal: FilterEvaluationDeal, rule: FilterRuleConfig): FilterEvaluationResult {
    const reasons: string[] = [];

    if (rule.isActive === false) {
      return {
        matches: false,
        reasons: ['Regra está inativa'],
      };
    }

    const fullSearchText = this.normalize(
      `${deal.title} ${deal.description || ''} ${deal.category || ''}`
    );

    // 1. Filtro de Categoria
    const ruleCategory = this.normalize(rule.category || 'TODOS');
    if (ruleCategory !== 'todos') {
      const isCategoryMatch = this.checkCategoryMatch(deal, ruleCategory);
      if (!isCategoryMatch) {
        return {
          matches: false,
          reasons: [`Produto não pertence à categoria "${rule.category}"`],
          failedAt: 'CATEGORY',
        };
      }
      reasons.push(`Categoria "${rule.category}" confirmada`);
    }

    // 2. Filtro de Palavras Negativas / Proibidas (Exclusão Imediata)
    const excludeTerms = this.splitTerms(rule.keywordsExclude);
    for (const term of excludeTerms) {
      if (this.containsTerm(fullSearchText, term)) {
        return {
          matches: false,
          reasons: [`Contém termo proibido: "${term}"`],
          failedAt: 'NEGATIVE_KEYWORD',
        };
      }
    }

    // 3. Filtro de Autores / Editoras / Marcas
    const brandOrAuthors = this.splitTerms(rule.brandOrAuthor);
    if (brandOrAuthors.length > 0) {
      const foundBrand = brandOrAuthors.find((brand) => this.containsTerm(fullSearchText, brand));
      if (!foundBrand) {
        return {
          matches: false,
          reasons: [
            `Nenhum dos autores/editoras/marcas requeridos (${rule.brandOrAuthor}) foi encontrado`,
          ],
          failedAt: 'BRAND_OR_AUTHOR',
        };
      }
      reasons.push(`Autor/Editora/Marca identificado: "${foundBrand}"`);
    }

    // 4. Filtro de Conceitos / Palavras-chave Obrigatórias
    const includeTerms = this.splitTerms(rule.keywordsInclude);
    if (includeTerms.length > 0) {
      const foundInclude = includeTerms.find((term) => this.containsTerm(fullSearchText, term));
      if (!foundInclude) {
        return {
          matches: false,
          reasons: [
            `Nenhum dos conceitos obrigatórios (${rule.keywordsInclude}) foi encontrado no produto`,
          ],
          failedAt: 'REQUIRED_KEYWORDS',
        };
      }
      reasons.push(`Conceito obrigatório presente: "${foundInclude}"`);
    }

    // 5. Filtro de Preço
    if (deal.price !== undefined && deal.price !== null) {
      if (rule.minPrice !== null && rule.minPrice !== undefined && deal.price < rule.minPrice) {
        return {
          matches: false,
          reasons: [`Preço R$ ${deal.price} abaixo do mínimo permitido (R$ ${rule.minPrice})`],
          failedAt: 'PRICE',
        };
      }
      if (rule.maxPrice !== null && rule.maxPrice !== undefined && deal.price > rule.maxPrice) {
        return {
          matches: false,
          reasons: [`Preço R$ ${deal.price} acima do máximo permitido (R$ ${rule.maxPrice})`],
          failedAt: 'PRICE',
        };
      }
    }

    // 6. Filtro de Desconto Mínimo
    if (rule.minDiscountPercent && rule.minDiscountPercent > 0) {
      let discount = deal.discountPercent;
      if (!discount && deal.originalPrice && deal.price && deal.originalPrice > deal.price) {
        discount = Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
      }

      if (!discount || discount < rule.minDiscountPercent) {
        return {
          matches: false,
          reasons: [
            `Desconto de ${discount || 0}% é menor que o desconto mínimo exigido de ${rule.minDiscountPercent}%`,
          ],
          failedAt: 'DISCOUNT',
        };
      }
      reasons.push(`Desconto de ${discount}% atende o critério mínimo`);
    }

    return {
      matches: true,
      reasons,
    };
  }

  private static containsTerm(sourceText: string, term: string): boolean {
    if (!term || term.length === 0) return false;
    // Permite busca de termo exato ou palavra completa
    const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
    return regex.test(sourceText) || sourceText.includes(term);
  }

  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static checkCategoryMatch(deal: FilterEvaluationDeal, ruleCategory: string): boolean {
    const text = this.normalize(`${deal.title} ${deal.category || ''}`);

    if (ruleCategory === 'livros') {
      return (
        text.includes('livro') ||
        text.includes('livros') ||
        text.includes('capa comum') ||
        text.includes('capa dura') ||
        text.includes('ebook') ||
        text.includes('edicao') ||
        text.includes('editora') ||
        text.includes('paginas') ||
        (deal.category ? this.normalize(deal.category).includes('livro') : false)
      );
    }

    if (ruleCategory === 'tech' || ruleCategory === 'tecnologia') {
      return (
        text.includes('smartphone') ||
        text.includes('notebook') ||
        text.includes('computador') ||
        text.includes('monitor') ||
        text.includes('fone') ||
        text.includes('teclado') ||
        text.includes('mouse') ||
        text.includes('smartwatch')
      );
    }

    if (ruleCategory === 'games') {
      return (
        text.includes('game') ||
        text.includes('jogo') ||
        text.includes('playstation') ||
        text.includes('ps5') ||
        text.includes('xbox') ||
        text.includes('nintendo') ||
        text.includes('console')
      );
    }

    if (ruleCategory === 'casa') {
      return (
        text.includes('airfryer') ||
        text.includes('cafeteira') ||
        text.includes('cozinha') ||
        text.includes('panela') ||
        text.includes('aspirador') ||
        text.includes('ventilador')
      );
    }

    return text.includes(ruleCategory);
  }
}
