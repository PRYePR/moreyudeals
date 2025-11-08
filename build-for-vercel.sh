#!/bin/bash
set -e

# Vercel monorepo build script
echo "Building web package from monorepo..."

# Change to web package directory
cd packages/web

# Run the build
yarn build

echo "Build completed successfully!"
