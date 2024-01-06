#!/bin/bash

# Change to the desired directory.
cd ~/work/tabius-org || { echo "Failed to change directory to ~/work/tabius-org"; exit 1; }

# Pull the latest changes from Git.
git pull --verbose || { echo "Git pull failed"; exit 1; }

# Remove node_modules and build dirs and install dependencies.
rm -rf dist || { echo "Failed to remove dist directory"; exit 1; }
rm -rf .angular || { echo "Failed to remove .angular directory"; exit 1; }
rm -rf node_modules || { echo "Failed to remove node_modules"; exit 1; }
npm install || { echo "npm install failed"; exit 1; }

# Stop the pm2 process.
pm2 stop tabius-org nest-org || { echo "pm2 stop failed"; exit 1; }

# Rebuild.
npm run build:ssr-org || { echo "npm run build:ssr-org failed"; exit 1; }

# Start the pm2 process.
pm2 start tabius-org nest-org || { echo "pm2 start failed"; exit 1; }

echo "Tabius redeployed successfully."
