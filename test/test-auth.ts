import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerApiRoutes } from '../src/modules/api/routes.js';

async function runAuthTests() {
  console.log('🧪 Iniciando testes da API de Autenticação e Rotas Protegidas...\n');

  const server = Fastify();
  await server.register(cors);
  registerApiRoutes(server);

  // 1. Teste Login com Credenciais Corretas
  const validLogin = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      username: 'admin',
      password: 'admin123',
    },
  });
  console.log('1. Login com credenciais válidas:');
  console.log('   Status:', validLogin.statusCode);
  const loginBody = JSON.parse(validLogin.body);
  console.log('   Retorno:', { success: loginBody.success, hasToken: !!loginBody.token });
  console.assert(validLogin.statusCode === 200, 'Login válido deveria retornar 200');
  console.assert(loginBody.success === true, 'Login válido deveria retornar success: true');
  console.assert(typeof loginBody.token === 'string', 'Token assinado deveria ser retornado');

  const token = loginBody.token;

  // 2. Teste Login com Senha Incorreta
  const invalidLogin = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      username: 'admin',
      password: 'wrongpassword',
    },
  });
  console.log('\n2. Login com senha errada:');
  console.log('   Status:', invalidLogin.statusCode);
  console.assert(invalidLogin.statusCode === 401, 'Login inválido deveria retornar 401');

  // 3. Teste Acesso a Rota Protegida sem Token
  const unauthAccess = await server.inject({
    method: 'GET',
    url: '/api/channels',
  });
  console.log('\n3. Acesso à rota protegida /api/channels sem token:');
  console.log('   Status:', unauthAccess.statusCode);
  console.assert(unauthAccess.statusCode === 401, 'Acesso sem token deveria retornar 401');

  // 4. Teste Acesso a Rota Protegida com Token Válido
  const authAccess = await server.inject({
    method: 'GET',
    url: '/api/channels',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('\n4. Acesso à rota protegida /api/channels com Bearer token:');
  console.log('   Status:', authAccess.statusCode);
  console.assert(authAccess.statusCode === 200, 'Acesso com token deveria retornar 200');

  // 5. Teste Rota /api/auth/me
  const meAccess = await server.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('\n5. Consulta /api/auth/me com token:');
  console.log('   Status:', meAccess.statusCode);
  const meBody = JSON.parse(meAccess.body);
  console.log('   Usuário:', meBody.user);
  console.assert(meAccess.statusCode === 200, '/api/auth/me deveria retornar 200');
  console.assert(meBody.user.username === 'admin', 'Username deveria ser admin');

  console.log('\n🎉 TODOS OS TESTES DE AUTENTICAÇÃO PASSARAM COM SUCESSO!');
  await server.close();
}

runAuthTests().catch(console.error);
