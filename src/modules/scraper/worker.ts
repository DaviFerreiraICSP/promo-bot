import cron from 'node-cron';
import { Bot } from 'grammy';
import { DealsAggregator } from './dealsAggregator.js';
import { MetadataScraper } from './metadata.js';
import { DealService } from '../bot/services/deal.service.js';
import { env } from '../../config/env.js';

export class ScraperWorker {
  private static isRunning = false;

  /**
   * Inicia o agendamento do scraper periódico
   */
  static start(bot: Bot) {
    if (!env.ENABLE_AUTO_SCRAPER) {
      console.log('ℹ️ Auto-scraper desativado pelas variáveis de ambiente.');
      return;
    }

    const interval = Math.max(1, env.SCRAPER_INTERVAL_MINUTES);
    const cronExpression = `*/${interval} * * * *`;

    console.log(`⏰ Scraper de promoções agendado: a cada ${interval} minutos (${cronExpression})`);

    // Executa uma vez no início após 10 segundos
    setTimeout(() => {
      this.runCycle(bot).catch((err) =>
        console.error('[ScraperWorker] Erro no ciclo inicial:', err)
      );
    }, 10_000);

    // Agenda execuções recorrentes
    cron.schedule(cronExpression, () => {
      this.runCycle(bot).catch((err) =>
        console.error('[ScraperWorker] Erro no ciclo agendado:', err)
      );
    });
  }

  /**
   * Ciclo individual de captura e distribuição
   */
  static async runCycle(bot: Bot) {
    if (this.isRunning) {
      console.log('[ScraperWorker] Ciclo anterior ainda em andamento, pulando...');
      return;
    }

    this.isRunning = true;
    console.log('[ScraperWorker] 🔍 Buscando novas promoções...');

    try {
      const deals = await DealsAggregator.fetchAll();
      console.log(`[ScraperWorker] Encontradas ${deals.length} promoções nas fontes.`);

      let postedCount = 0;

      for (const deal of deals) {
        try {
          // Se a imagem ou preço estiver faltando, tenta enriquecer com o MetadataScraper
          let imageUrl = deal.imageUrl;
          let price = deal.price;

          if (!imageUrl || !price) {
            const meta = await MetadataScraper.extract(deal.targetUrl);
            if (!imageUrl && meta.imageUrl) imageUrl = meta.imageUrl;
            if (!price && meta.price) price = meta.price;
          }

          const result = await DealService.distributeAutoDeal(
            {
              title: deal.title,
              targetUrl: deal.targetUrl,
              sourceUrl: deal.sourceUrl,
              price,
              imageUrl,
              coupon: deal.coupon,
              source: deal.source,
            },
            bot
          );

          if (result && 'deliveredCount' in result && (result.deliveredCount || 0) > 0) {
            postedCount++;
            // Pequeno delay entre envios para evitar rate limit do Telegram
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (dealErr) {
          console.error(`[ScraperWorker] Erro ao processar oferta "${deal.title}":`, dealErr);
        }
      }

      console.log(`[ScraperWorker] Ciclo concluído. ${postedCount} ofertas distribuídas.`);
    } catch (error) {
      console.error('[ScraperWorker] Erro crítico no ciclo do scraper:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
