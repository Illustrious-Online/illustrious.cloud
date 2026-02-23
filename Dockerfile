FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb ./
COPY ./ /app

RUN bun install
# Avoid --minify-syntax: can cause __promiseAll ReferenceError in compiled output
RUN bun build --compile --target bun --outfile server ./src/app.ts

FROM oven/bun:latest AS production

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000
ENV NODE_ENV production
CMD ["./server"]
