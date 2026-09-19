FROM nginx:alpine@sha256:72ba65eb42c10344912a84ff42408db7d34f2feb642204570ab8fc5ffd29f1d3
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/99-kiddosprout-config.sh /docker-entrypoint.d/99-kiddosprout-config.sh
RUN chmod +x /docker-entrypoint.d/99-kiddosprout-config.sh
COPY *.html /usr/share/nginx/html/
COPY *.css /usr/share/nginx/html/
COPY *.js /usr/share/nginx/html/
COPY *.avif /usr/share/nginx/html/
COPY *.jpg /usr/share/nginx/html/
COPY *.png /usr/share/nginx/html/
COPY *.webp /usr/share/nginx/html/
COPY *.webmanifest /usr/share/nginx/html/
COPY *.game /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY games/ /usr/share/nginx/html/games/
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1/healthz"]
