FROM node:26.13.1-bookworm-slim
WORKDIR /app
COPY server.mjs fetch-page.mjs ./
USER node
ENV METADATA_LISTEN_HOST=0.0.0.0
EXPOSE 8080
CMD ["node", "server.mjs"]
