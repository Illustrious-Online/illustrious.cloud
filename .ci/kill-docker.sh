#!/bin/bash

ACTIVE_CONTAINER=$(docker ps | awk '/postgres/ {print $1}')

if [ -z "$ACTIVE_CONTAINER" ]; then
  echo "Postgres docker not running"
else
  echo "Postgres DB running: ${ACTIVE_CONTAINER}"
  docker container kill $ACTIVE_CONTAINER
fi