FROM node:10-alpine AS node

COPY package.json package-lock.json ./

RUN npm ci && mkdir /app && mv ./node_modules ./app

WORKDIR /app

COPY . ./

RUN npm run ng build -- --prod --output-path=dist

FROM nginx:stable

RUN chmod g+rwx /var/cache/nginx /var/run /var/log/nginx

RUN sed -i.bak 's/^user/#user/' /etc/nginx/nginx.conf

RUN sed -i.bak 's/listen\(.*\)80;/listen 8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080

RUN rm -rf /usr/share/nginx/html

COPY --from=node /app/dist/* /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
