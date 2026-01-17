FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Define env vars to skip download and point to installed chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Switch to root to install dependencies
USER root

COPY package*.json ./
RUN npm ci

COPY . .

# Be sure to use the 'pptruser' (non-root) provided by the base image for security and chrome stability
USER pptruser

CMD ["node", "server.js"]
