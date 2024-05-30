#!/bin/bash

ACTIVE_CONTAINER=$(docker ps | awk '/postgres/ {print $1}')
CURRENT_CONTAINER=$(docker ps -a -q --filter="name=postgres")
CURRENT_IMAGE=$(docker images | grep 'postgres')

if [ -z "$ACTIVE_CONTAINER" ]; then
  echo "Postgres docker not running"
else
  echo "Kill Postgres container: ${ACTIVE_CONTAINER}"
  docker container kill $ACTIVE_CONTAINER
fi

if [ -z "$CURRENT_CONTAINER" ]; then
  echo "Postgres container not found"
else
  echo "Removing current container: '${ACTIVE_CONTAINER}'"
  docker container rm $ACTIVE_CONTAINER
fi

if [ -z "$ACTIVE_IMAGE" ]; then
  echo "Postgres image not found"
else
  echo "Removing current image: ${ACTIVE_IMAGE}"
  docker rmi $ACTIVE_IMAGE
fi