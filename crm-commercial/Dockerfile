FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Vite inlines these at build time, so they must be present before `bun run build`.
ARG VITE_API_URL
ARG VITE_APP_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV

COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# URL interne du backend Hono (réseau Coolify). Surchargée par l'env du déploiement.
ENV BACKEND_UPSTREAM=http://backend:3000
# N'autorise envsubst QUE sur cette variable : les $host/$uri/... de nginx sont préservés.
ENV NGINX_ENVSUBST_FILTER=BACKEND_UPSTREAM

# Template traité par envsubst au démarrage (-> /etc/nginx/conf.d/default.conf).
COPY <<'EOF' /etc/nginx/templates/default.conf.template
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # Interfaces + API servies par le backend, accessibles via le seul domaine staff.
    location /backoffice  { proxy_pass ${BACKEND_UPSTREAM}; }
    location /admin       { proxy_pass ${BACKEND_UPSTREAM}; }
    location /swagger     { proxy_pass ${BACKEND_UPSTREAM}; }
    location /api         { proxy_pass ${BACKEND_UPSTREAM}; }
    location /recette-api { proxy_pass ${BACKEND_UPSTREAM}; }

    # SPA React (fallback index.html pour le routing client).
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

EXPOSE 80
