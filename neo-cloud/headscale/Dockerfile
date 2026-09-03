# L'image officielle headscale est distroless (pas de shell) : on prend le binaire
# de la release GitHub (somme verifiee) et on le pose sur Alpine pour avoir sh
# (entrypoint) et wget (healthcheck). Serveur Coolify = x86_64.
FROM alpine:3.21
ARG HEADSCALE_VERSION=0.26.1
RUN apk add --no-cache ca-certificates tzdata wget \
    && mkdir -p /etc/headscale /var/lib/headscale /var/run/headscale \
    && cd /tmp \
    && wget -q "https://github.com/juanfont/headscale/releases/download/v${HEADSCALE_VERSION}/headscale_${HEADSCALE_VERSION}_linux_amd64" \
    && wget -q "https://github.com/juanfont/headscale/releases/download/v${HEADSCALE_VERSION}/checksums.txt" \
    && grep "headscale_${HEADSCALE_VERSION}_linux_amd64$" checksums.txt | sha256sum -c - \
    && install -m 0755 "headscale_${HEADSCALE_VERSION}_linux_amd64" /usr/local/bin/headscale \
    && rm -f /tmp/headscale_* /tmp/checksums.txt
COPY config.yaml /etc/headscale/config.yaml
COPY policy.hujson /etc/headscale/policy.hujson
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
