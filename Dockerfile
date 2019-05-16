FROM node:10-alpine AS node

COPY package.json package-lock.json ./

RUN npm ci && mkdir /app && mv ./node_modules ./app

WORKDIR /app

COPY . ./

RUN npm run ng build -- --prod --output-path=dist

FROM nginx:stable

RUN chmod g+rwx /var/cache/nginx /var/run /var/log/nginx

COPY nginx.conf.template /etc/nginx/

RUN rm -rf /usr/share/nginx/html

COPY --from=node /app/dist/* /usr/share/nginx/html/

EXPOSE 8080

CMD envsubst < /etc/nginx/nginx.conf.template > /tmp/nginx.conf && nginx -c /tmp/nginx.conf
