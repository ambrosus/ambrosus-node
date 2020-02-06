FROM node:10-alpine

RUN apk add git python make g++ --no-cache

WORKDIR /app

COPY ./package.json ./yarn.lock /app/

RUN yarn install

COPY . ./

RUN yarn build

ARG GIT_COMMIT
RUN test -n "$GIT_COMMIT"
ENV GIT_COMMIT="$GIT_COMMIT"
LABEL git_commit="$GIT_COMMIT"

CMD ["yarn", "start"]
