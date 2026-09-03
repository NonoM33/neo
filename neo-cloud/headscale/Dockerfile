# L'image officielle headscale est distroless (pas de shell) : on prend le binaire
# et on le pose sur Alpine pour avoir sh (entrypoint) et wget (healthcheck).
FROM headscale/headscale:0.26.1 AS upstream

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata \
    && mkdir -p /etc/headscale /var/lib/headscale /var/run/headscale
COPY --from=upstream /bin/headscale /usr/local/bin/headscale
COPY config.yaml /etc/headscale/config.yaml
COPY policy.hujson /etc/headscale/policy.hujson
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh /usr/local/bin/headscale
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
