FROM oven/bun:1.2 AS production

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY . .

EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "./src/app.ts"]
