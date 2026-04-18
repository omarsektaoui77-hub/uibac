#!/bin/bash

echo "🚀 Setting up AI SOC..."

npm init -y
npm install express body-parser node-fetch

mkdir -p apps/api
mkdir -p apps/dashboard
mkdir -p data

echo "[]" > data/events.json
echo "[]" > data/memory.json

echo "✅ Setup complete"
