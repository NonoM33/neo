FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run typecheck || true

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && bun run db:seed; bun run start"]
