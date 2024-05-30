#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

$DIR/reset-db.sh
bun run docker:db &
sleep 4
bun run db:migrate
bun test
$DIR/reset-db.sh