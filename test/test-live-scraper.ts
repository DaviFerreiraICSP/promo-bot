import { DealsAggregator } from '../src/modules/scraper/dealsAggregator.js';

async function main() {
  console.log('--- TESTE: DealsAggregator Live Scraper ---');
  const startTime = Date.now();

  const deals = await DealsAggregator.fetchAll();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\nTempo de execução: ${elapsed}s`);
  console.log(`Total de ofertas capturadas: ${deals.length}`);

  if (deals.length === 0) {
    console.error('ERRO: Nenhuma oferta encontrada!');
    process.exit(1);
  }

  console.log('\nAmostra de 5 ofertas reais capturadas:');
  deals.slice(0, 5).forEach((d, idx) => {
    console.log(`[${idx + 1}] [${d.source}]`);
    console.log(`    Título: ${d.title}`);
    console.log(`    Preço:  ${d.price ? `R$ ${d.price.toFixed(2)}` : 'Não informado'}`);
    console.log(`    Loja/Alvo: ${d.targetUrl}`);
    console.log(`    Origem:    ${d.sourceUrl}`);
    if (d.coupon) console.log(`    Cupom:     ${d.coupon}`);
    if (d.imageUrl) console.log(`    Imagem:    ${d.imageUrl.slice(0, 60)}...`);
  });

  console.log('\nTeste concluído com sucesso!');
}

main().catch((err) => {
  console.error('Falha no teste:', err);
  process.exit(1);
});
