FROM node:22-alpine

WORKDIR /app

# Workspace package manifests
COPY package.json package-lock.json ./
COPY core/package.json core/
COPY server/package.json server/

RUN npm ci

# Source required for TypeScript build
COPY core/tsconfig.json core/
COPY core/src core/src
COPY server/tsconfig.json server/
COPY server/src server/src
COPY data data/

RUN npm run build

# Drop devDependencies after compile (keep workspace links for @photo-snipe/core)
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8787

CMD ["node", "server/dist/index.js"]
