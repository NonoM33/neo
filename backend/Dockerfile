FROM oven/bun:1-alpine

WORKDIR /app

# Chromium système pour le rendu PDF (HTML → PDF via Playwright). Sur alpine,
# on utilise le paquet chromium plutôt que le binaire téléchargé par Playwright.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Empêche Playwright de tenter de télécharger un navigateur à l'install.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROMIUM_PATH=/usr/bin/chromium-browser

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run typecheck || true

EXPOSE 3000

CMD ["sh", "-c", "bun run src/db/migrate.ts && (bun run db:seed || true) && bun run start"]
