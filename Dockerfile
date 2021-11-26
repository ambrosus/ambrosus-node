FROM node:14-alpine

RUN apk add git python3 make g++ --no-cache

WORKDIR /app

COPY ./package.json ./yarn.lock /app/

RUN yarn install && yarn cache clean

COPY . ./

RUN yarn build

CMD ["yarn", "start"]
