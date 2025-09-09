# Dockerfile for Aurabot_With_Meta_EC
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose port 4000
EXPOSE 4000

# Start the application
CMD ["node", "src/index.js"]
