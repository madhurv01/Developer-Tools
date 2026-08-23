FROM node:20-slim

WORKDIR /app

# Copy only manifest files first so Docker can cache the npm install layer
# and skip re-running it on every code change - this is the standard
# real-world pattern for fast rebuilds.
COPY package.json .
RUN npm install --omit=dev

COPY server.js .

EXPOSE 4000

CMD ["node", "server.js"]
