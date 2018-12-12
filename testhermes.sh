#!/bin/bash
docker-compose down --rmi local;
yarn dev:docker:db;
yarn dev:docker:parity;
yarn dev:deploy;
yarn dev:migrate;
yarn dev:prerun:hermes;
yarn dev:start:server &
pid=$!;
sleep 3;
SERVER_PORT=9877 yarn dev:start:hermes;
kill $pid;
