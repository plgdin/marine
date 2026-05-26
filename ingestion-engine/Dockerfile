# Use a lightweight Node image
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install PM2 globally so we can use it to force-restart the script
RUN npm install -g pm2

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the engine source code
COPY . .

# Run PM2 in no-daemon mode so the Docker container stays alive
CMD ["pm2-runtime", "ecosystem.config.cjs"]
