# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./

# Install dependencies (--legacy-peer-deps handles minor peer-dep conflicts in CRA)
RUN npm install --legacy-peer-deps

# Copy the rest of the source
COPY . .

# REACT_APP_API_URL is set to /api so nginx can proxy it to the backend
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Increase Node memory for large CRA builds and suppress noisy warnings
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
