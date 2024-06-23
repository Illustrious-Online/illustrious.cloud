FROM oven/bun

WORKDIR /app

COPY .env .
COPY package.json .
COPY bun.lockb .

RUN bun install

COPY drizzle drizzle
COPY src src
COPY tsconfig.json .
COPY cert.crt .

ENV NODE_ENV production
CMD ["bun", "start"]

EXPOSE 8000


