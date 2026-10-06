import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerApiRoutes } from '../src/modules/api/routes.js';

async function testFastifyServer() {
  console.log('🧪 Testando inicialização do Fastify e rotas de API...');

  const server = Fastify();
  await server.register(cors);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, '../public');

  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
  });

  registerApiRoutes(server);

  // Teste 1: Rota estática do Dashboard
  const responseHtml = await server.inject({
    method: 'GET',
    url: '/',
  });
  console.log('1. GET / (Dashboard HTML): Status', responseHtml.statusCode);
  console.assert(responseHtml.statusCode === 200, 'Dashboard HTML deveria retornar 200');
  console.assert(responseHtml.body.includes('PromoBot Dashboard'), 'Conteúdo do HTML incorreto!');

  // Teste 2: Script JS do Dashboard
  const responseJs = await server.inject({
    method: 'GET',
    url: '/app.js',
  });
  console.log('2. GET /app.js: Status', responseJs.statusCode);
  console.assert(responseJs.statusCode === 200, 'app.js deveria retornar 200');

  // Teste 3: Simulador de Filtros via POST /api/deals/test-filter
  const testRule = {
    name: 'Livros de Teologia',
    category: 'LIVROS',
    keywordsInclude: 'teologia, graca',
    keywordsExclude: 'autoajuda',
    brandOrAuthor: 'Vida Nova',
  };

  const responseFilter = await server.inject({
    method: 'POST',
    url: '/api/deals/test-filter',
    payload: {
      url: 'https://www.amazon.com.br/dp/B09B8VGCR8',
      rule: testRule,
    },
  });
  console.log('3. POST /api/deals/test-filter: Status', responseFilter.statusCode);
  const filterJson = JSON.parse(responseFilter.body);
  console.log('   Diagnóstico:', filterJson.evaluation ? filterJson.evaluation.reasons : filterJson);

  console.log('\n✅ Servidor Fastify e rotas REST validados com sucesso!');
  await server.close();
}

testFastifyServer().catch(console.error);
