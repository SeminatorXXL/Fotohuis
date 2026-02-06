# Use official Node.js image
FROM node:20

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your app files
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Command to start your app
CMD ["node", "server.js"]
