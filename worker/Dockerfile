FROM node:22-alpine

# Install Docker CLI (worker needs it to spawn language containers)
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "start"]