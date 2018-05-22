FROM node:9

WORKDIR /app

COPY ./package.json ./yarn.lock /app/

RUN yarn install

COPY . ./

RUN yarn build
RUN yarn ops:generate_private_key

ENTRYPOINT yarn start
