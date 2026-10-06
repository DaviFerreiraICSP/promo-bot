import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/promobot?schema=public'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),
  ADMIN_TELEGRAM_ID: z.string().optional(),
  SCRAPER_INTERVAL_MINUTES: z.coerce.number().default(10),
  ENABLE_AUTO_SCRAPER: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .default(true),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin123'),
  JWT_SECRET: z.string().default('promobot_secret_session_key_2026'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Configuração inválida no .env:');
    error.issues.forEach((issue) => {
      console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    });
  }
  // Se estivermos em dev sem token configurado, não derrubamos de imediato
  // para permitir testes unitários ou geração de builds.
  parsedEnv = {
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    PORT: Number(process.env.PORT) || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/promobot?schema=public',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
    ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID,
    SCRAPER_INTERVAL_MINUTES: Number(process.env.SCRAPER_INTERVAL_MINUTES) || 10,
    ENABLE_AUTO_SCRAPER: process.env.ENABLE_AUTO_SCRAPER !== 'false',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
    JWT_SECRET: process.env.JWT_SECRET || 'promobot_secret_session_key_2026',
  };
}

export const env = parsedEnv;
