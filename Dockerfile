FROM node:10-alpine AS node

COPY package.json package-lock.json ./

RUN npm ci && mkdir /app && mv ./node_modules ./app

WORKDIR /app

COPY . ./

RUN npm run ng build -- --prod --output-path=dist

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/

RUN rm -rf /usr/share/nginx/html

COPY --from=node /app/dist/* /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 8080
