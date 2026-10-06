# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src

RUN npm run build

# Stage 2: Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Instala apenas dependências de produção e gera o cliente Prisma
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Aplica automaticamente o esquema no banco de dados e inicia o serviço
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
