FROM nginx:alpine
COPY docker-entrypoint.d/99-kiddosprout-config.sh /docker-entrypoint.d/99-kiddosprout-config.sh
RUN chmod +x /docker-entrypoint.d/99-kiddosprout-config.sh
COPY . /usr/share/nginx/html/
EXPOSE 80
