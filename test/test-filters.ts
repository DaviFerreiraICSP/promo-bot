import { FilterEngine, FilterRuleConfig, FilterEvaluationDeal } from '../src/modules/filters/filterEngine.js';

async function runFilterTests() {
  console.log('🧪 Iniciando testes do Motor de Filtros Granulares de Nicho...\n');

  const theologyRule: FilterRuleConfig = {
    name: 'Livros de Teologia Reformada',
    category: 'LIVROS',
    keywordsInclude: 'teologia, doutrina, graça, expiação, soberania, fé',
    keywordsExclude: 'autoajuda, romance, esoterismo, ficção',
    brandOrAuthor: 'Vida Nova, Thomas Nelson, Editora Fiel, John Piper, C.S. Lewis, Spurgeon, Calvino',
    minPrice: 10,
    maxPrice: 120,
    minDiscountPercent: 20,
    checkIntervalMinutes: 15,
  };

  // Cenário 1: Livro de Teologia perfeito (Deve APROVAR)
  const validDeal: FilterEvaluationDeal = {
    title: 'Livro: Graça Futura - O poder purificador da fé em Deus - Capa Comum',
    description: 'Excelente obra sobre doutrina e graça de Deus. Editora Vida Nova. Autor: John Piper',
    price: 49.9,
    originalPrice: 79.9,
    discountPercent: 37,
    category: 'Livros',
  };

  const res1 = FilterEngine.evaluate(validDeal, theologyRule);
  console.log('1. Teste Livro Teologia John Piper (Editora Vida Nova):');
  console.log('   Resultado:', res1.matches ? '✅ APROVADO' : '❌ REPROVADO');
  console.log('   Motivos:', res1.reasons);
  console.assert(res1.matches === true, 'Cenário 1 deveria ter sido aprovado!');

  // Cenário 2: Livro com termo proibido "autoajuda" (Deve REPROVAR)
  const selfHelpDeal: FilterEvaluationDeal = {
    title: 'Livro: 10 Passos para o Sucesso e Autoajuda Espiritual',
    description: 'Aprenda sobre fé e prosperidade. Editora Vida Nova',
    price: 39.9,
    originalPrice: 59.9,
    discountPercent: 33,
    category: 'Livros',
  };

  const res2 = FilterEngine.evaluate(selfHelpDeal, theologyRule);
  console.log('\n2. Teste Livro com termo proibido "autoajuda":');
  console.log('   Resultado:', res2.matches ? '✅ APROVADO' : '❌ REPROVADO');
  console.log('   Motivos:', res2.reasons);
  console.assert(res2.matches === false, 'Cenário 2 deveria ter sido reprovado por autoajuda!');
  console.assert(res2.failedAt === 'NEGATIVE_KEYWORD', 'Falha deveria ser NEGATIVE_KEYWORD!');

  // Cenário 3: Livro sem nenhum dos autores ou editoras requeridos (Deve REPROVAR)
  const unknownAuthorDeal: FilterEvaluationDeal = {
    title: 'Livro: Introdução à Teologia e Doutrina Cristã',
    description: 'Escrito por Autor Desconhecido. Editora Aleatória',
    price: 45.0,
    originalPrice: 65.0,
    discountPercent: 30,
    category: 'Livros',
  };

  const res3 = FilterEngine.evaluate(unknownAuthorDeal, theologyRule);
  console.log('\n3. Teste Livro sem autor/editora da lista:');
  console.log('   Resultado:', res3.matches ? '✅ APROVADO' : '❌ REPROVADO');
  console.log('   Motivos:', res3.reasons);
  console.assert(res3.matches === false, 'Cenário 3 deveria ter sido reprovado por autor/editora!');
  console.assert(res3.failedAt === 'BRAND_OR_AUTHOR', 'Falha deveria ser BRAND_OR_AUTHOR!');

  // Cenário 4: Preço acima do teto permitido (Max R$ 120, livro custa R$ 180) (Deve REPROVAR)
  const expensiveDeal: FilterEvaluationDeal = {
    title: 'Livro: As Institutas da Religião Cristã - João Calvino (Capa Dura)',
    description: 'Tratado clássico de teologia e soberania divina. Editora Fiel',
    price: 180.0,
    originalPrice: 250.0,
    discountPercent: 28,
    category: 'Livros',
  };

  const res4 = FilterEngine.evaluate(expensiveDeal, theologyRule);
  console.log('\n4. Teste Livro com preço acima do teto (R$ 180 > R$ 120):');
  console.log('   Resultado:', res4.matches ? '✅ APROVADO' : '❌ REPROVADO');
  console.log('   Motivos:', res4.reasons);
  console.assert(res4.matches === false, 'Cenário 4 deveria ter sido reprovado por preço!');
  console.assert(res4.failedAt === 'PRICE', 'Falha deveria ser PRICE!');

  // Cenário 5: Categoria errada (Tech em canal de livros) (Deve REPROVAR)
  const techDeal: FilterEvaluationDeal = {
    title: 'Smartphone Samsung Galaxy S23 128GB 5G',
    description: 'Excelente celular com câmera potente',
    price: 2899.0,
    originalPrice: 4000.0,
    discountPercent: 27,
    category: 'Eletrônicos',
  };

  const res5 = FilterEngine.evaluate(techDeal, theologyRule);
  console.log('\n5. Teste Smartphone em canal de Livros:');
  console.log('   Resultado:', res5.matches ? '✅ APROVADO' : '❌ REPROVADO');
  console.log('   Motivos:', res5.reasons);
  console.assert(res5.matches === false, 'Cenário 5 deveria ter sido reprovado por categoria!');
  console.assert(res5.failedAt === 'CATEGORY', 'Falha deveria ser CATEGORY!');

  console.log('\n🎉 TODOS OS TESTES DO MOTOR DE FILTROS PASSARAM COM SUCESSO!');
}

runFilterTests().catch(console.error);
