FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY core/package.json core/
COPY server/package.json server/

RUN npm ci

COPY core core/
COPY server server/
COPY data data/

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY core/package.json core/
COPY server/package.json server/

RUN npm ci --omit=dev

COPY --from=build /app/core/dist core/dist
COPY --from=build /app/server/dist server/dist
COPY data data/

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "server/dist/index.js"]
