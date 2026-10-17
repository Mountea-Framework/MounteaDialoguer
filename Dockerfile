# Self-hosted web edition: build the app against the bundled sync server, then run that server.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The desktop-only dependencies are not needed here; do not download Electron.
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm ci
COPY . .
# Sync with the bundled server instead of a cloud provider (see SELF_HOSTED.md).
ENV VITE_SYNC_SERVER=true
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data DIST_DIR=/app/dist
COPY --from=build /app/dist ./dist
COPY server ./server
# MCP server (own process/port) and the few pure modules of the web app it reuses (loaded through mcp/register.mjs).
COPY package.json ./package.json
COPY mcp ./mcp
COPY src/lib/persistence/canonicalProject.js src/lib/persistence/schema.js ./src/lib/persistence/
COPY src/lib/localization ./src/lib/localization
COPY src/lib/domainIntegrity.js src/lib/rowTiming.js src/lib/assetNaming.js ./src/lib/
COPY src/helpers/nameHelpers.js ./src/helpers/nameHelpers.js
COPY src/config/dialogueNodes.json src/config/edgeConditions.js ./src/config/
VOLUME /data
EXPOSE 8080 8081
# Runs as root on purpose: a bind-mounted ./data is created root-owned by Docker and a non-root user could not write to it.
CMD ["node", "server/index.mjs"]
