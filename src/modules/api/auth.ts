import crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';

export interface AuthUser {
  username: string;
  role: string;
}

export class AuthService {
  /**
   * Gera um token de sessão assinado com HMAC-SHA256
   */
  static generateToken(username: string): string {
    const payload = {
      username,
      role: 'ADMIN',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias de validade
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verifica a validade e expiração do token
   */
  static verifyToken(token: string): { valid: boolean; user?: AuthUser } {
    try {
      const [payloadBase64, signature] = token.split('.');
      if (!payloadBase64 || !signature) {
        return { valid: false };
      }

      const expectedSignature = crypto
        .createHmac('sha256', env.JWT_SECRET)
        .update(payloadBase64)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { valid: false };
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) {
        return { valid: false }; // Token expirado
      }

      return {
        valid: true,
        user: {
          username: payload.username,
          role: payload.role || 'ADMIN',
        },
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Middleware de proteção de rotas Fastify
   */
  static async requireAuth(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Acesso negado. Token de autenticação não fornecido.',
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const verification = AuthService.verifyToken(token);

    if (!verification.valid || !verification.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado.',
      });
    }

    // Injeta o usuário autenticado na requisição
    (request as any).user = verification.user;
  }
}
