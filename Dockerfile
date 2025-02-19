FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb ./
COPY ./ /app

RUN bun install
RUN bun build --compile --minify-whitespace --minify-syntax --target bun --outfile server ./src/app.ts

FROM oven/bun:latest AS production

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 4000
ENV NODE_ENV production
CMD ["./server"]
