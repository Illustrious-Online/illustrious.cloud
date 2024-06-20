#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

$DIR/reset-db.sh
bun run db:docker &
sleep 2
./wait-for-it.sh localhost:5432 --strict --timeout=300
# Cheeky for pg reboot (?)
sleep 5
./wait-for-it.sh localhost:5432 --strict --timeout=300
bun run db:migrate
bun test
$DIR/reset-db.sh
