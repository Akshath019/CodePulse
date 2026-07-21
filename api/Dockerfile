# Base image — small Alpine Linux with Node 22
FROM node:22-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port our API listens on
EXPOSE 4000

# Start the server
CMD ["npm", "run", "start"]