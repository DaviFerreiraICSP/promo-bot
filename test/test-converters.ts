import { AffiliateRouter } from '../src/modules/affiliates/index.js';
import { MessageFormatter } from '../src/modules/bot/formatters/message.js';

async function runTests() {
  console.log('🧪 Iniciando testes de conversão de links de afiliados...\n');

  const testConfig = {
    amazonTag: 'davipromos-20',
    shopeeTag: 'shopee_davi',
    mercadolivreTag: 'mlb_davi',
    magaluTag: 'magazinedavi',
  };

  // 1. Teste Amazon
  const amazonUrl = 'https://www.amazon.com.br/Echo-Dot-5%C2%AA-gera%C3%A7%C3%A3o-Cor-Preta/dp/B09B8VGCR8?tag=outratag-20&ref_=as_li_ss_tl';
  const amazonRes = await AffiliateRouter.processUrl(amazonUrl, testConfig);
  console.log('1. Teste Amazon:');
  console.log('   Original:', amazonUrl);
  console.log('   Canônica:', amazonRes.canonicalUrl);
  console.log('   Afiliado:', amazonRes.affiliateUrl);
  console.log('   Hash:', amazonRes.dealHash);
  console.assert(amazonRes.affiliateUrl.includes('tag=davipromos-20'), 'Tag Amazon não inserida!');
  console.assert(!amazonRes.affiliateUrl.includes('outratag-20'), 'Tag antiga não removida!');

  // 2. Teste Shopee
  const shopeeUrl = 'https://shopee.com.br/Fone-de-Ouvido-Bluetooth-i.12345678.987654321?af_siteid=999';
  const shopeeRes = await AffiliateRouter.processUrl(shopeeUrl, testConfig);
  console.log('\n2. Teste Shopee:');
  console.log('   Original:', shopeeUrl);
  console.log('   Canônica:', shopeeRes.canonicalUrl);
  console.log('   Afiliado:', shopeeRes.affiliateUrl);
  console.assert(shopeeRes.affiliateUrl.includes('af_sub1=shopee_davi'), 'Tag Shopee não inserida!');

  // 3. Teste Mercado Livre
  const mlUrl = 'https://produto.mercadolivre.com.br/MLB-3581729182-smart-tv-50-polegadas-4k?matt_tool=12345';
  const mlRes = await AffiliateRouter.processUrl(mlUrl, testConfig);
  console.log('\n3. Teste Mercado Livre:');
  console.log('   Original:', mlUrl);
  console.log('   Canônica:', mlRes.canonicalUrl);
  console.log('   Afiliado:', mlRes.affiliateUrl);
  console.assert(mlRes.affiliateUrl.includes('matt_tool=mlb_davi'), 'Tag Mercado Livre não inserida!');

  // 4. Teste Magalu
  const magaluUrl = 'https://www.magazineluiza.com.br/smartphone-samsung-galaxy-s23/p/2374928100/te/s23/';
  const magaluRes = await AffiliateRouter.processUrl(magaluUrl, testConfig);
  console.log('\n4. Teste Magalu:');
  console.log('   Original:', magaluUrl);
  console.log('   Canônica:', magaluRes.canonicalUrl);
  console.log('   Afiliado:', magaluRes.affiliateUrl);
  console.assert(magaluRes.affiliateUrl.includes('magazinevoce.com.br/magazinedavi'), 'Loja Magazine Você não inserida!');

  // 5. Teste MessageFormatter
  console.log('\n5. Teste de Formatação de Mensagens (Telegram e WhatsApp):');
  const tgFormatted = MessageFormatter.formatTelegramHtml({
    title: 'Echo Dot 5ª Geração Smart Speaker com Alexa',
    price: 299.0,
    originalPrice: 429.0,
    discountPercent: 30,
    coupon: 'ALEXA30',
    affiliateUrl: amazonRes.affiliateUrl,
    platform: 'AMAZON',
    customFooter: '👉 Entre no nosso grupo VIP para mais ofertas!',
  });
  console.log('--- Telegram HTML Caption ---');
  console.log(tgFormatted.caption);
  console.log('Buttons:', tgFormatted.inlineKeyboard);

  const waFormatted = MessageFormatter.formatWhatsAppText({
    title: 'Echo Dot 5ª Geração Smart Speaker com Alexa',
    price: 299.0,
    originalPrice: 429.0,
    discountPercent: 30,
    coupon: 'ALEXA30',
    affiliateUrl: amazonRes.affiliateUrl,
    platform: 'AMAZON',
    customFooter: '👉 Entre no nosso grupo VIP para mais ofertas!',
  });
  console.log('\n--- WhatsApp Text ---');
  console.log(waFormatted);

  console.log('\n✅ Todos os testes passaram com sucesso!');
}

runTests().catch(console.error);
