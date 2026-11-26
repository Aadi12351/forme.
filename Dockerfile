FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data /app/uploads /app/backups && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node","server.js"]
