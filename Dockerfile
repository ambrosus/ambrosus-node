FROM node:9

WORKDIR /app

COPY . ./

RUN yarn install
RUN yarn build

ENTRYPOINT yarn start
