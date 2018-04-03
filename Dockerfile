FROM node:9

WORKDIR /app

COPY . ./

RUN yarn install
RUN yarn build
RUN yarn ops:generate_private_key

ENTRYPOINT yarn start
