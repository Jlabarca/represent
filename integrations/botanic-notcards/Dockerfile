ARG BOTANIC_RUNTIME=registry.librechat.ai/librechat-ai/librechat-api:v0.8.8@sha256:9cde97da2b504adc90b8b01b606697f1fd6d71e2152345060133c7b41bfabc21
FROM node:24.16.0-alpine AS dependencies
WORKDIR /app
ENV SCARF_ANALYTICS=false
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY client/package.json ./client/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/client/package.json ./packages/client/package.json
COPY packages/data-provider/package.json ./packages/data-provider/package.json
COPY packages/data-schemas/package.json ./packages/data-schemas/package.json
RUN npm ci --no-audit --fund=false

FROM dependencies AS frontend
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run frontend

FROM ${BOTANIC_RUNTIME}
COPY --from=frontend /app/client/dist /app/client/dist
COPY --from=frontend /app/api/server/index.js /app/api/server/index.js
COPY --from=frontend /app/api/server/controllers/agents/request.js /app/api/server/controllers/agents/request.js
COPY --from=frontend /app/api/server/routes/convos.js /app/api/server/routes/convos.js
COPY --from=frontend /app/api/server/services/Endpoints/agents/initialize.js /app/api/server/services/Endpoints/agents/initialize.js
COPY --from=frontend /app/api/server/notcards /app/api/server/notcards
COPY --from=frontend /app/api/strategies/socialLogin.js /app/api/strategies/socialLogin.js
