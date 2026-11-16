FROM node:22-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9
WORKDIR /app
COPY src/notcards/package*.json ./src/notcards/
RUN npm ci --omit=dev --ignore-scripts --prefix src/notcards
COPY src/notcards/*.mjs ./src/notcards/
COPY src/clay-notes/core.mjs ./src/clay-notes/
COPY src/clay-notes/web ./src/clay-notes/web
COPY dist/notcards-extension/notcards-dev.zip ./releases/notcards-dev.zip
RUN install -d -o node -g node -m 0700 /data
USER node
EXPOSE 8080
CMD ["node", "src/notcards/cli.mjs"]
