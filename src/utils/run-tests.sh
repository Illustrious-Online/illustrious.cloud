#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$1" ]; then
  echo "Executing locally, use docker image"
  $DIR/reset-db.sh
  bun run db:docker &
else
  echo "Executing in CI, do NOT use docker image"
fi
sleep 4
bun run db:migrate
bun test
if [ -z "$1" ]; then
  echo "Executing locally, reset database docker instance"
  $DIR/reset-db.sh
else
  echo "Executing in CI, pass through"
fi
