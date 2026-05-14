FROM node:24.15-alpine
WORKDIR /app
RUN npm install -g pnpm
RUN chown -R node:node /app
USER node
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install
EXPOSE 5173
CMD ["pnpm", "dev"]