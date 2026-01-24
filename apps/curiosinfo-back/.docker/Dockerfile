FROM node:20-alpine AS base
WORKDIR /app

# Installer deps
COPY package*.json ./
RUN npm ci

# Copier le code (utile si tu build prod plus tard)
COPY . .

EXPOSE 3000

FROM base AS dev
CMD ["npm", "run", "dev"]
