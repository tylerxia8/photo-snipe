FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY core/package.json core/
COPY server/package.json server/
COPY client/web/package.json client/web/

RUN npm ci

COPY core/tsconfig.json core/
COPY core/src core/src
COPY server/tsconfig.json server/
COPY server/src server/src
COPY client/web/tsconfig.json client/web/
COPY client/web/vite.config.ts client/web/
COPY client/web/index.html client/web/
COPY client/web/src client/web/src
COPY data data/

RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8787

CMD ["node", "server/dist/index.js"]
