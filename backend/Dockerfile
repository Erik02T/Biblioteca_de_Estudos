# ============================================
# STAGE 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências de build (Prisma precisa do OpenSSL)
RUN apk add --no-cache openssl

# Copia arquivos de dependência
COPY package.json package-lock.json ./

# Instala dependências de produção
RUN npm ci --omit=dev

# Copia o restante do código fonte
COPY . .

# Gera o Prisma Client
RUN npx prisma generate

# Compila o backend
RUN npm run build

# ============================================
# STAGE 2: Produção
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Instala OpenSSL para Prisma Client
RUN apk add --no-cache openssl

# Cria usuário não-root para execução
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia apenas o necessário do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Não copia .env — variáveis devem ser injetadas via ambiente da plataforma

USER appuser

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Porta configurada via variável de ambiente PORT
CMD ["node", "dist/main"]
