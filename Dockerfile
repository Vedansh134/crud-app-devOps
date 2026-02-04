# Define the official node.js base image
FROM node:18-alpine

# Create the working directory
WORKDIR /app

# Copy package.json on app directory
COPY package.json package-lock.json ./

# Install npm
RUN npm install

# Copy all the app code
COPY . .

# Expose the app on Internet
EXPOSE 5000

# Start the application
CMD ["node","index.js"]