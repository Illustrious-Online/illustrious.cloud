#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

$DIR/reset-db.sh
bun run db:docker &
sleep 2
./wait-for-it.sh localhost:5432 --strict --timeout=1000
if [ -n "$1" ]; then
  sleep 2
  ./wait-for-it.sh localhost:5432 --strict --timeout=300
fi
bun run db:migrate
bun test
$DIR/reset-db.sh
