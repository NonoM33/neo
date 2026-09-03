FROM headscale/headscale:0.26.1
COPY config.yaml /etc/headscale/config.yaml
COPY policy.hujson /etc/headscale/policy.hujson
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
