FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install
COPY . .
# Variables publiques inlinées par Astro au build (output: static)
ARG PUBLIC_POSTHOG_KEY
ARG PUBLIC_POSTHOG_HOST
ARG PUBLIC_API_BASE_URL
ENV PUBLIC_POSTHOG_KEY=$PUBLIC_POSTHOG_KEY
ENV PUBLIC_POSTHOG_HOST=$PUBLIC_POSTHOG_HOST
ENV PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL
RUN bun run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
