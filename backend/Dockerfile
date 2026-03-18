FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "bun run db:push && bun run db:seed && bun run start"]
