# --- Base image für Build
FROM node:20-alpine AS builder

WORKDIR /app

# Installiere pnpm & dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Quellcode kopieren & builden
COPY . .
RUN pnpm build

# --- Runtime-Stage mit Playwright
FROM node:20-slim AS runner

# Benötigte System-Abhängigkeiten für Playwright
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 \
    libxdamage1 libxfixes3 libxkbcommon0 libx11-xcb1 libxcb1 libxext6 libglib2.0-0 \
    libxshmfence1 libxrender1 libasound2 libpangocairo-1.0-0 libgtk-3-0 \
    curl ca-certificates fonts-liberation libappindicator3-1 libxss1 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Code und node_modules vom Builder übernehmen
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/runner ./runner
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/example-custom-blocks ./example-custom-blocks
COPY --from=builder /app/workflows ./workflows

# Playwright-Browser installieren
RUN npx playwright install --with-deps

# Start der Next.js App
CMD ["node_modules/.bin/next", "start"]
