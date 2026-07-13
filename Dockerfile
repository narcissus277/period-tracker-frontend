FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY manifest.json /usr/share/nginx/html/manifest.json
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080