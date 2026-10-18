# syntax=docker/dockerfile:1
# WAB-Server image. Build context is the REPOSITORY ROOT (the server consumes the sibling
# wab-notifications and wab-otp packages through `file:` dependencies):
#   docker build -f WAB-Server/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /repo
COPY wab-notifications/package.json wab-notifications/package-lock.json ./wab-notifications/
RUN cd wab-notifications && npm ci
COPY wab-notifications/tsconfig.json wab-notifications/tsup.config.ts ./wab-notifications/
COPY wab-notifications/src ./wab-notifications/src
RUN cd wab-notifications && npm run build
COPY wab-otp/package.json wab-otp/package-lock.json ./wab-otp/
RUN cd wab-otp && npm ci
COPY wab-otp/tsconfig.json wab-otp/tsup.config.ts ./wab-otp/
COPY wab-otp/src ./wab-otp/src
RUN cd wab-otp && npm run build
COPY WAB-Server/package.json WAB-Server/package-lock.json ./WAB-Server/
RUN cd WAB-Server && npm ci
COPY WAB-Server/tsconfig.json WAB-Server/tsconfig.build.json ./WAB-Server/
COPY WAB-Server/src ./WAB-Server/src
RUN cd WAB-Server && npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY wab-notifications/package.json wab-notifications/package-lock.json ./wab-notifications/
RUN cd wab-notifications && npm ci --omit=dev && npm cache clean --force
COPY --from=build /repo/wab-notifications/dist ./wab-notifications/dist
COPY wab-otp/package.json wab-otp/package-lock.json ./wab-otp/
RUN cd wab-otp && npm ci --omit=dev && npm cache clean --force
COPY --from=build /repo/wab-otp/dist ./wab-otp/dist
COPY WAB-Server/package.json WAB-Server/package-lock.json ./WAB-Server/
RUN cd WAB-Server && npm ci --omit=dev && npm cache clean --force
COPY --from=build /repo/WAB-Server/dist ./WAB-Server/dist
WORKDIR /repo/WAB-Server
# Run unprivileged; configuration comes from environment variables only (no .env files in the image).
USER node
# The listening port comes from PORT; the healthcheck reads the same variable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
