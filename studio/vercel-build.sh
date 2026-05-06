#!/bin/bash
set -e

echo "Starting build..."
cd studio

echo "Installing dependencies..."
npm install

echo "Running build..."
npm run build

echo "Build completed successfully!"
